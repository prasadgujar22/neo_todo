export function shouldUseRemoteTodoState(remote) {
  return remote.initialized || remote.todos.length > 0 || remote.groups.length > 0
}

export function shouldSaveRemoteTodoState(state, hasUserMutation) {
  return hasUserMutation || state.todos.length > 0 || state.groups.length > 0
}
