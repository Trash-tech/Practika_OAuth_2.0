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

function createPostCard(post, currentUser) {
    const card = document.createElement('div');
    card.className = 'post-card';

    const header = document.createElement('div');
    header.className = 'post-header';

    const author = document.createElement('span');
    author.className = 'post-author';
    author.textContent = post.author;

    const date = document.createElement('span');
    date.textContent = new Date(post.pub_date).toLocaleString();

    header.appendChild(author);
    header.appendChild(date);

    const text = document.createElement('div');
    text.className = 'post-text';
    text.textContent = post.text;

    card.appendChild(header);
    card.appendChild(text);

    const canDelete = currentUser && currentUser.username === post.author;

    if (canDelete) {
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-post-btn';
        deleteButton.textContent = 'Удалить';
        deleteButton.addEventListener('click', () => deletePost(post.id));

        card.appendChild(deleteButton);
    }

    return card;
}

async function loadPosts() {
    const postsDiv = document.getElementById('posts');
    const currentUser = await getCurrentUser();

    const response = await fetch('/api/v1/posts/');
    const data = await response.json();
    const posts = data.results || data;

    postsDiv.textContent = '';

    if (!posts.length) {
        const emptyText = document.createElement('p');
        emptyText.textContent = 'Постов пока нет.';
        postsDiv.appendChild(emptyText);
        return;
    }

    posts.forEach(post => {
        const card = createPostCard(post, currentUser);
        postsDiv.appendChild(card);
    });
}

loadPosts();