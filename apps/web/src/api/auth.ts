import request from '../utils/http'


export interface RegisterData {
  username: string
  password: string
}

export interface AuthResponse {
  access_token: string
  user: {
    id: number
    username: string
    isAdmin: boolean
    points: number
  }
}

/**
 * User login
 */
export function login(source: string, params: any) {
  return request.get<AuthResponse>({ url: `/auth/login/${source}`, params }, { errorMessageMode: 'none' })
}

/**
 * Login Support
 */
export function getLoginSupport() {
  return request.get<{ thirdParty: string[] }>({ url: '/auth/login/support' }, { errorMessageMode: 'none' })
}
