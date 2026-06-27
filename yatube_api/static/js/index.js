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

function createAuthorAvatar(post) {
    const avatar = document.createElement('div');
    avatar.className = 'post-author-avatar';

    renderAvatarBox(avatar, post.author_avatar_url, post.author);

    return avatar;
}

function createPostCard(post, currentUser) {
    const card = document.createElement('article');
    card.className = 'post-card';

    const header = document.createElement('div');
    header.className = 'post-header';

    const authorBlock = document.createElement('div');
    authorBlock.className = 'post-author-block';

    const avatar = createAuthorAvatar(post);

    const author = document.createElement('span');
    author.className = 'post-author';
    author.textContent = post.author;

    authorBlock.append(avatar, author);

    const date = document.createElement('span');
    date.className = 'post-date';
    date.textContent = new Date(post.pub_date).toLocaleString();

    header.append(authorBlock, date);

    const text = document.createElement('div');
    text.className = 'post-text';
    text.textContent = post.text;

    card.append(header, text);

    const canDelete = currentUser && currentUser.username === post.author;

    if (canDelete) {
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-post-btn';
        deleteButton.type = 'button';
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

    postsDiv.replaceChildren();

    if (!posts.length) {
        const emptyMessage = document.createElement('p');
        emptyMessage.textContent = 'Постов пока нет.';
        postsDiv.appendChild(emptyMessage);
        return;
    }

    posts.forEach(post => {
        const card = createPostCard(post, currentUser);
        postsDiv.appendChild(card);
    });
}

loadPosts();