# API для Yatube

API для учебного проекта Yatube. Сервис позволяет получать публикации,
создавать новые посты, комментировать публикации, просматривать сообщества и
подписываться на авторов. Авторизация выполняется с помощью JWT-токенов.

## Технологии

- Python
- Django
- Django REST Framework
- Simple JWT
- SQLite

## Установка и запуск

Клонируйте репозиторий и перейдите в папку проекта:

```bash
git clone <адрес репозитория>
cd api-final-yatube-ad
```

Создайте и активируйте виртуальное окружение:

```bash
python -m venv venv
source venv/bin/activate
```

Для Windows:

```bash
venv\Scripts\activate
```

Установите зависимости:

```bash
pip install -r requirements.txt
```

Перейдите в папку с `manage.py`, выполните миграции и запустите сервер:

```bash
cd yatube_api
python manage.py migrate
python manage.py runserver
```

Документация API будет доступна по адресу:

```text
http://127.0.0.1:8000/redoc/
```

## Примеры запросов

Получить список публикаций:

```http
GET /api/v1/posts/
```

Создать публикацию:

```http
POST /api/v1/posts/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "text": "Новая публикация",
  "group": 1
}
```

Получить JWT-токен:

```http
POST /api/v1/jwt/create/
Content-Type: application/json

{
  "username": "user",
  "password": "password"
}
```

Подписаться на автора:

```http
POST /api/v1/follow/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "following": "author_username"
}
```

Получить комментарии к публикации:

```http
GET /api/v1/posts/1/comments/
```
