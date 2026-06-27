document.getElementById('loginBtn').addEventListener('click', async () => {
    const message = document.getElementById('message');
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const response = await fetch('/api/v1/jwt/create/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
        localStorage.setItem('access', data.access);
        localStorage.setItem('refresh', data.refresh);
        window.location.href = '/';
    } else {
        message.textContent = 'Неверный логин или пароль';
    }
});