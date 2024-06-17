const baseUrl = window.location.origin;
let users = {};

async function fetchJsonData(fileName) {
  const response = await fetch(`${baseUrl}/fetch/data/${fileName}`);
  return response.json();
}

async function fetchItemCount() {
  try {
    const response = await fetch(`${baseUrl}/count-items`);
    const data = await response.json();
    populateSelectOptions(data.count);
  } catch (error) {
    console.error('Error fetching item count:', error);
  }
}

function populateSelectOptions(count) {
  const selectElement = document.getElementById('discussionSelect');
  // selectElement.innerHTML = '';

  for (let i = 0; i < count; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.text = `Discussion ${i + 1}`;
    if (i === count - 1) {
      option.selected = true;
    }
    selectElement.appendChild(option);
  }
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
  template.querySelector('.message').innerHTML = message;
  template.querySelector('.forum-signature').textContent = user.signature;

  if (post.reactions && post.reactions.length > 0) {
    const reactionsList = template.querySelector('.reactions ul');
    post.reactions.forEach(reaction => {
      const user = users[reaction.user];
      const listItem = document.createElement('li');
      listItem.innerHTML = `
      <img src="${baseUrl}/fetch/assets/thumbnails/${reaction.user}.jpg" alt="${reaction.name}">
      <span class="emoji">${reaction.emoji}</span>
      `;
      reactionsList.appendChild(listItem);
    });
  } else {
    template.querySelector('.reactions').remove();
  }

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
  await fetchItemCount();
  updatePosts();
});

const fileInput = document.getElementById('jsonFileInput');
fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const posts = JSON.parse(e.target.result);
            renderPosts(posts)
        };
        reader.readAsText(file);
    }
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(registration => {
      console.log('Service Worker registered with scope:', registration.scope);
    })
    .catch(error => {
      console.error('Service Worker registration failed:', error);
    });
}
