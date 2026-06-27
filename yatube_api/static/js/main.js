function isAuth() {
    return Boolean(localStorage.getItem('refresh'));
}

async function refreshAccessToken() {
    const refresh = localStorage.getItem('refresh');

    if (!refresh) {
        return false;
    }

    const response = await fetch('/api/v1/jwt/refresh/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh })
    });

    if (!response.ok) {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        return false;
    }

    const data = await response.json();
    localStorage.setItem('access', data.access);
    return true;
}

async function authFetch(url, options = {}) {
    const token = localStorage.getItem('access');

    const headers = {
        ...(options.headers || {})
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    let response = await fetch(url, {
        ...options,
        headers
    });

    if (response.status !== 401) {
        return response;
    }

    const refreshed = await refreshAccessToken();

    if (!refreshed) {
        return response;
    }

    const newHeaders = {
        ...(options.headers || {}),
        Authorization: `Bearer ${localStorage.getItem('access')}`
    };

    return fetch(url, {
        ...options,
        headers: newHeaders
    });
}

function updateHeader() {
    const authLinks = document.querySelectorAll('.auth-link');
    const guestLinks = document.querySelectorAll('.guest-link');

    if (isAuth()) {
        authLinks.forEach(item => item.classList.remove('hidden'));
        guestLinks.forEach(item => item.classList.add('hidden'));
    } else {
        authLinks.forEach(item => item.classList.add('hidden'));
        guestLinks.forEach(item => item.classList.remove('hidden'));
    }
}

const logoutBtn = document.getElementById('logoutBtn');

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        window.location.href = '/';
    });
}

updateHeader();