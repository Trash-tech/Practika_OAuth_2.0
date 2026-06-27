document.getElementById('registerBtn').addEventListener('click', async () => {
    const message = document.getElementById('message');
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const response = await fetch('/api/v1/register/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password })
    });

    if (response.ok) {
        message.textContent = 'Аккаунт создан. Сейчас выполним вход.';

        const loginResponse = await fetch('/api/v1/jwt/create/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const loginData = await loginResponse.json();

        if (loginResponse.ok) {
            localStorage.setItem('access', loginData.access);
            localStorage.setItem('refresh', loginData.refresh);
            window.location.href = '/';
        }
    } else {
        const data = await response.json();
        message.textContent = JSON.stringify(data);
    }
});