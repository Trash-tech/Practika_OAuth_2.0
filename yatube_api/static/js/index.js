async function getCurrentUser() {
    if (!localStorage.getItem('refresh')) {
        return null;
    }

    const response = await authFetch('/api/v1/profile/');

    if (!response.ok) {
        return null;
    }

    return response.json();
}

async function deletePost(postId) {
    const response = await authFetch(`/api/v1/posts/${postId}/`, {
        method: 'DELETE'
    });

    if (response.ok) {
        loadPosts();
    } else {
        alert('Удалить пост не получилось');
    }
}

async function loadPosts() {
    const postsDiv = document.getElementById('posts');
    const currentUser = await getCurrentUser();

    const response = await fetch('/api/v1/posts/');
    const data = await response.json();
    const posts = data.results || data;

    postsDiv.innerHTML = '';

    if (!posts.length) {
        postsDiv.innerHTML = '<p>Постов пока нет.</p>';
        return;
    }

    posts.forEach(post => {
        const card = document.createElement('div');
        card.className = 'post-card';

        const canDelete = currentUser && currentUser.username === post.author;

        card.innerHTML = `
            <div class="post-header">
                <span class="post-author">${post.author}</span>
                <span>${new Date(post.pub_date).toLocaleString()}</span>
            </div>
            <div class="post-text">${post.text}</div>
            ${
                canDelete
                    ? `<button class="delete-post-btn" onclick="deletePost(${post.id})">Удалить</button>`
                    : ''
            }
        `;

        postsDiv.appendChild(card);
    });
}

loadPosts();