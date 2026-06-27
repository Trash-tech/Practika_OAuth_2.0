import re

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator

from posts.models import Comment, Follow, Group, Post, UserProfile

User = get_user_model()


def normalize_username(value):
    return re.sub(r'\s+', ' ', value.strip())


def validate_username_value(value, current_user=None):
    value = normalize_username(value)

    if not value:
        raise serializers.ValidationError('Никнейм не может быть пустым.')

    if not re.match(r'^[\w.@+\- ]+$', value):
        raise serializers.ValidationError(
            'Никнейм может содержать только буквы, цифры, пробелы '
            'и символы @/./+/-/_.'
        )

    users = User.objects.filter(username=value)

    if current_user:
        users = users.exclude(pk=current_user.pk)

    if users.exists():
        raise serializers.ValidationError(
            'Пользователь с таким никнеймом уже существует.'
        )

    return value


def get_profile_avatar_url(profile, request=None):
    if profile.avatar:
        avatar_url = profile.avatar.url

        if request:
            return request.build_absolute_uri(avatar_url)

        return avatar_url

    if profile.yandex_avatar_url:
        return profile.yandex_avatar_url

    return None


class PostSerializer(serializers.ModelSerializer):
    author = serializers.SlugRelatedField(
        slug_field='username',
        read_only=True
    )
    author_avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = (
            'id',
            'author',
            'author_avatar_url',
            'text',
            'pub_date',
            'image',
            'group',
        )
        read_only_fields = ('author', 'author_avatar_url')

    def get_author_avatar_url(self, obj):
        profile = UserProfile.objects.filter(user=obj.author).first()

        if not profile:
            return None

        request = self.context.get('request')
        return get_profile_avatar_url(profile, request)


class GroupSerializer(serializers.ModelSerializer):

    class Meta:
        model = Group
        fields = ('id', 'title', 'slug', 'description')


class CommentSerializer(serializers.ModelSerializer):
    author = serializers.SlugRelatedField(
        slug_field='username',
        read_only=True
    )

    class Meta:
        model = Comment
        fields = ('id', 'author', 'text', 'created', 'post')
        read_only_fields = ('author', 'post')


class FollowSerializer(serializers.ModelSerializer):
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())
    following = serializers.SlugRelatedField(
        slug_field='username',
        queryset=User.objects.all()
    )

    class Meta:
        model = Follow
        fields = ('user', 'following')
        validators = [
            UniqueTogetherValidator(
                queryset=Follow.objects.all(),
                fields=('user', 'following')
            )
        ]

    def validate_following(self, value):
        if self.context['request'].user == value:
            raise serializers.ValidationError('Нельзя подписаться на себя.')

        return value

    def to_representation(self, instance):
        return {
            'user': instance.user.username,
            'following': instance.following.username,
        }


class RegisterSerializer(serializers.ModelSerializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=8)
    email = serializers.EmailField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password')

    def validate_username(self, value):
        return validate_username_value(value)

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(max_length=150)
    avatar_url = serializers.SerializerMethodField()
    can_change_password = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id',
            'username',
            'email',
            'avatar_url',
            'can_change_password',
        )
        read_only_fields = (
            'id',
            'email',
            'avatar_url',
            'can_change_password',
        )

    def validate_username(self, value):
        user = self.context['request'].user
        return validate_username_value(value, user)

    def get_avatar_url(self, obj):
        profile, created = UserProfile.objects.get_or_create(user=obj)
        request = self.context.get('request')
        return get_profile_avatar_url(profile, request)

    def get_can_change_password(self, obj):
        return obj.has_usable_password()


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_old_password(self, value):
        user = self.context['request'].user

        if not user.check_password(value):
            raise serializers.ValidationError('Неверный текущий пароль.')

        return value

    def validate_new_password(self, value):
        validate_password(value, self.context['request'].user)
        return value
