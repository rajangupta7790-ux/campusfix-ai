// Where each kind of user lands after login
export const homePathFor = (user) => (user?.role === 'admin' ? '/admin' : '/dashboard');