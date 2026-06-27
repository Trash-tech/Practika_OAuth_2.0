if (!localStorage.getItem('refresh')) {
    window.location.href = '/login/';
}

async function loadProfile() {
    const message = document.getElementById('profileMessage');

    const response = await authFetch('/api/v1/profile/');

    if (!response.ok) {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        window.location.href = '/login/';
        return;
    }

    const data = await response.json();

    document.getElementById('username').value = data.username;
    document.getElementById('email').value = data.email || 'Почта не указана';

    const avatar = document.getElementById('avatar');
    avatar.style.backgroundImage = '';
    avatar.textContent = data.username[0].toUpperCase();

    if (data.avatar_url) {
        avatar.textContent = '';
        avatar.style.backgroundImage = `url(${data.avatar_url})`;
        avatar.style.backgroundSize = 'cover';
        avatar.style.backgroundPosition = 'center';
    }

    message.textContent = '';
}

document.getElementById('saveProfileBtn').addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const message = document.getElementById('profileMessage');

    const response = await authFetch('/api/v1/profile/', {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username })
    });

    const data = await response.json();

    if (response.ok) {
        message.textContent = 'Никнейм обновлён';
        document.getElementById('avatar').textContent = data.username[0].toUpperCase();
    } else {
        message.textContent = JSON.stringify(data);
    }
});

document.getElementById('changePasswordBtn').addEventListener('click', async () => {
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const repeatPassword = document.getElementById('repeatPassword').value;
    const message = document.getElementById('passwordMessage');

    if (newPassword !== repeatPassword) {
        message.textContent = 'Новые пароли не совпадают';
        return;
    }

    if (newPassword.length < 8) {
        message.textContent = 'Пароль должен быть не короче 8 символов';
        return;
    }

    const response = await authFetch('/api/v1/profile/change-password/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            old_password: oldPassword,
            new_password: newPassword
        })
    });

    if (response.ok) {
        message.textContent = 'Пароль изменён';
        document.getElementById('oldPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('repeatPassword').value = '';
    } else {
        const data = await response.json();
        message.textContent = JSON.stringify(data);
    }
});

document.getElementById('avatarInput').addEventListener('change', async () => {
    const file = document.getElementById('avatarInput').files[0];
    const message = document.getElementById('profileMessage');

    if (!file) {
        return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    const response = await authFetch('/api/v1/profile/avatar/', {
        method: 'PATCH',
        body: formData
    });

    if (response.ok) {
        message.textContent = 'Аватар обновлён';
        loadProfile();
    } else {
        message.textContent = 'Загрузка аватара пока не подключена на бэке';
    }
});

loadProfile();