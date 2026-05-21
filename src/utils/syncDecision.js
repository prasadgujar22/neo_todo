export function shouldUseRemoteTodoState(remote) {
  return remote.initialized || remote.todos.length > 0 || remote.groups.length > 0
}
