if (!localStorage.getItem('refresh')) {
    window.location.href = '/login/';
}

function getFirstLetter(username) {
    const value = String(username || '').trim();

    if (!value) {
        return '?';
    }

    return value[0].toUpperCase();
}

function prepareUrlForCss(url) {
    return String(url || '').replace(/"/g, '\\"');
}

function renderAvatarBox(element, imageUrl, username) {
    const letter = getFirstLetter(username);

    element.replaceChildren();
    element.textContent = letter;
    element.style.backgroundImage = '';

    if (!imageUrl) {
        return;
    }

    const image = new Image();

    image.addEventListener('load', () => {
        element.textContent = '';
        element.style.backgroundImage = `url("${prepareUrlForCss(imageUrl)}")`;
    });

    image.addEventListener('error', () => {
        element.replaceChildren();
        element.textContent = letter;
        element.style.backgroundImage = '';
    });

    image.src = imageUrl;
}

function renderProfileAvatar(data) {
    const avatar = document.getElementById('avatar');
    renderAvatarBox(avatar, data.avatar_url, data.username);
}

function updatePasswordSection(canChangePassword) {
    const passwordSection = document.getElementById('passwordSection');

    if (!passwordSection) {
        return;
    }

    if (canChangePassword) {
        passwordSection.classList.remove('hidden');
    } else {
        passwordSection.classList.add('hidden');
    }
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

    renderProfileAvatar(data);
    updatePasswordSection(data.can_change_password);

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
        renderProfileAvatar(data);
        updatePasswordSection(data.can_change_password);
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
        const data = await response.json();
        message.textContent = JSON.stringify(data);
    }
});

loadProfile();