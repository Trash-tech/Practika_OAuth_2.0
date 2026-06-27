if (!localStorage.getItem('refresh')) {
    window.location.href = '/login/';
}

document.getElementById('createPostBtn').addEventListener('click', async () => {
    const message = document.getElementById('message');
    const text = document.getElementById('postText').value;

    const response = await authFetch('/api/v1/posts/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
    });

    if (response.ok) {
        window.location.href = '/';
    } else {
        const data = await response.json();
        message.textContent = JSON.stringify(data);
    }
});