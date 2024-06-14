const baseUrl = window.location.origin;
let users = {};

async function fetchJsonData(fileName) {
  const response = await fetch(`${baseUrl}/fetch/data/${fileName}`);
  return response.json();
}

async function loadUsers() {
    users = await fetchJsonData('users.json'); 
}

async function updatePosts() {
  const select = document.getElementById('discussionSelect');
  const selectedValue = select.value;
  const posts = await fetchJsonData(`posts${selectedValue}.json`);
  renderPosts(posts);
}

function highlightUsernames(message) {
  const usernamePattern = /@(\w+)/g;
  return message.replace(usernamePattern, (match, p1) => `<span class="highlight">@${users[p1].username}</span>`);
}

function createPost(post) {
  const user = users[post.user];
  const message = highlightUsernames(post.message)
  const template = document.getElementById('post-template').content.cloneNode(true);
  template.querySelector('img').src = `${baseUrl}/fetch/assets/thumbnails/${post.user}.jpg`;
  template.querySelector('img').alt = user.username;
  template.querySelector('.username').textContent = user.username;
  template.querySelector('.content-box').innerHTML = message;
  template.querySelector('.forum-signature').textContent = user.signature;
  return template;
}

function renderPosts(posts) {
  const forumContainer = document.getElementById('forum-container');
  forumContainer.innerHTML = '';
  posts.forEach(post => {
    const postElement = createPost(post);
    forumContainer.appendChild(postElement);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadUsers();
  updatePosts();
});