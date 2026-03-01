import { example } from '../utils'

class UserService {
  async login(_email: string, _password: string) {
    // Simulate login process
    return { success: true }
  }
}

export default example(async (untouchable, { log }) => {
  const service = new UserService()

  const revoke = untouchable(service, 'login', (email, _password) => {
    log(`User login attempt: ${email}`)
  })

  await service.login('user1@example.com', 'password123')

  revoke() // restore original function

  await service.login('user2@example.com', 'password456')
})
