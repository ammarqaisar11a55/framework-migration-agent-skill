const users = [
  { id: 1, name: 'Ada' },
  { id: 2, name: 'Grace' },
];

function nextId() {
  return users.length + 1;
}

export { users, nextId };
