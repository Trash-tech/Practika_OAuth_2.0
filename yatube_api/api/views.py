import json
import secrets
from urllib.parse import urlencode

import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import get_object_or_404
from rest_framework import filters, generics, mixins, permissions, status, viewsets
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from posts.models import Group, Post, UserProfile
from .permissions import IsAuthorOrReadOnly
from .serializers import (
    CommentSerializer,
    FollowSerializer,
    GroupSerializer,
    PostSerializer,
    ProfileSerializer,
    RegisterSerializer,
    ChangePasswordSerializer,
)

User = get_user_model()


class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    permission_classes = (
        permissions.IsAuthenticatedOrReadOnly,
        IsAuthorOrReadOnly,
    )

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class GroupViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Group.objects.all()
    serializer_class = GroupSerializer
    permission_classes = (permissions.AllowAny,)


class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = (
        permissions.IsAuthenticatedOrReadOnly,
        IsAuthorOrReadOnly,
    )

    def get_queryset(self):
        post = get_object_or_404(Post, pk=self.kwargs.get('post_id'))
        return post.comments.all()

    def perform_create(self, serializer):
        post = get_object_or_404(Post, pk=self.kwargs.get('post_id'))
        serializer.save(author=self.request.user, post=post)


class FollowViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet
):
    serializer_class = FollowSerializer
    permission_classes = (permissions.IsAuthenticated,)
    filter_backends = (filters.SearchFilter,)
    search_fields = ('following__username',)

    def get_queryset(self):
        return self.request.user.follower.all()


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)

        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()

        return Response({'detail': 'Пароль изменён.'}, status=status.HTTP_200_OK)


class AvatarUploadView(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    parser_classes = (MultiPartParser, FormParser)

    def patch(self, request):
        avatar = request.FILES.get('avatar') or request.data.get('avatar')

        if not avatar:
            return Response(
                {'avatar': 'Файл аватарки не передан.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        profile, created = UserProfile.objects.get_or_create(user=request.user)
        profile.avatar = avatar
        profile.save()

        return Response(
            {
                'avatar_url': request.build_absolute_uri(profile.avatar.url)
            },
            status=status.HTTP_200_OK
        )


class YandexLoginView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        state = secrets.token_urlsafe(32)
        request.session['yandex_oauth_state'] = state

        params = {
            'response_type': 'code',
            'client_id': settings.YANDEX_CLIENT_ID,
            'redirect_uri': settings.YANDEX_REDIRECT_URI,
            'scope': settings.YANDEX_OAUTH_SCOPE,
            'state': state,
        }

        auth_url = (
            f'{settings.YANDEX_OAUTH_AUTHORIZE_URL}?{urlencode(params)}'
        )

        return HttpResponseRedirect(auth_url)


class YandexCallbackView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        error = request.GET.get('error')

        if error:
            return HttpResponse(
                f'Ошибка авторизации через Яндекс: {error}',
                status=400
            )

        code = request.GET.get('code')
        state = request.GET.get('state')
        saved_state = request.session.pop('yandex_oauth_state', None)

        if not code:
            return HttpResponse('Яндекс не вернул code.', status=400)

        if not saved_state or state != saved_state:
            return HttpResponse('Некорректный state.', status=400)

        token_response = requests.post(
            settings.YANDEX_OAUTH_TOKEN_URL,
            data={
                'grant_type': 'authorization_code',
                'code': code,
                'client_id': settings.YANDEX_CLIENT_ID,
                'client_secret': settings.YANDEX_CLIENT_SECRET,
            },
            timeout=10
        )

        if not token_response.ok:
            return HttpResponse(
                f'Ошибка получения токена Яндекса: {token_response.text}',
                status=400
            )

        yandex_token = token_response.json().get('access_token')

        if not yandex_token:
            return HttpResponse('Яндекс не вернул access_token.', status=400)

        user_info_response = requests.get(
            settings.YANDEX_USER_INFO_URL,
            params={'format': 'json'},
            headers={'Authorization': f'OAuth {yandex_token}'},
            timeout=10
        )

        if not user_info_response.ok:
            return HttpResponse(
                f'Ошибка получения данных пользователя: '
                f'{user_info_response.text}',
                status=400
            )

        yandex_data = user_info_response.json()
        user = self.get_or_create_user(yandex_data)

        refresh = RefreshToken.for_user(user)
        access = str(refresh.access_token)

        html = f'''
        <!DOCTYPE html>
        <html lang="ru">
        <head>
            <meta charset="UTF-8">
            <title>Вход через Яндекс</title>
        </head>
        <body>
            <script>
                localStorage.setItem('access', {json.dumps(access)});
                localStorage.setItem('refresh', {json.dumps(str(refresh))});
                window.location.href = '/';
            </script>
        </body>
        </html>
        '''

        return HttpResponse(html)

    def get_or_create_user(self, yandex_data):
        yandex_id = yandex_data.get('id') or yandex_data.get('psuid')
        email = yandex_data.get('default_email')
        login = yandex_data.get('login')

        if not yandex_id:
            raise ValueError('Яндекс не вернул id пользователя.')

        profile = UserProfile.objects.filter(yandex_id=yandex_id).first()

        if profile:
            return profile.user

        user = None

        if email:
            user = User.objects.filter(email=email).first()

        if not user:
            username = self.get_unique_username(login, email, yandex_id)
            user = User.objects.create_user(
                username=username,
                email=email or ''
            )

        profile, created = UserProfile.objects.get_or_create(user=user)
        profile.yandex_id = yandex_id

        avatar_url = self.get_yandex_avatar_url(yandex_data)

        if avatar_url and not profile.avatar:
            profile.yandex_avatar_url = avatar_url

        profile.save()

        if email and not user.email:
            user.email = email
            user.save()

        return user

    def get_unique_username(self, login, email, yandex_id):
        base_username = login

        if not base_username and email:
            base_username = email.split('@')[0]

        if not base_username:
            base_username = f'yandex_{yandex_id}'

        base_username = base_username[:140]
        username = base_username
        counter = 1

        while User.objects.filter(username=username).exists():
            username = f'{base_username}_{counter}'
            counter += 1

        return username

    def get_yandex_avatar_url(self, yandex_data):
        avatar_id = yandex_data.get('default_avatar_id')
        is_avatar_empty = yandex_data.get('is_avatar_empty')

        if not avatar_id or is_avatar_empty:
            return ''

        return (
            f'https://avatars.yandex.net/get-yapic/'
            f'{avatar_id}/islands-200'
        )
