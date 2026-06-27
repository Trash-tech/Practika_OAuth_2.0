from django.urls import include, path
from rest_framework.routers import DefaultRouter
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)
from .views import (
    CommentViewSet,
    FollowViewSet,
    GroupViewSet,
    PostViewSet,
    ProfileView,
    RegisterView,
    AvatarUploadView,
    ChangePasswordView,
    YandexCallbackView,
    YandexLoginView,
)

router = DefaultRouter()
router.register('v1/posts', PostViewSet, basename='posts')
router.register('v1/groups', GroupViewSet, basename='groups')        
router.register(
    r'v1/posts/(?P<post_id>\d+)/comments',
    CommentViewSet,
    basename='comments'
)

router.register('v1/follow', FollowViewSet, basename='follow')

urlpatterns = [
    path('v1/register/', RegisterView.as_view(), name='register'),
    path('v1/profile/', ProfileView.as_view(), name='profile'),
    path('v1/jwt/create/', TokenObtainPairView.as_view(), name='jwt-create'),
    path('v1/jwt/refresh/', TokenRefreshView.as_view(), name='jwt-refresh'),
    path('v1/jwt/verify/', TokenVerifyView.as_view(), name='jwt-verify'),
    path('', include(router.urls)),
    path(
        'v1/profile/change-password/',
        ChangePasswordView.as_view(),
        name='change-password'
    ),
    path(
        'v1/profile/avatar/',
        AvatarUploadView.as_view(),
        name='profile-avatar'
    ),
    path(
        'v1/oauth/yandex/login/',
        YandexLoginView.as_view(),
        name='yandex-login'
    ),
    path(
        'v1/oauth/yandex/callback/',
        YandexCallbackView.as_view(),
        name='yandex-callback'
    ),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
