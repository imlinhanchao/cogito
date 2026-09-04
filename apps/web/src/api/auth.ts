import request from '../utils/http'


export interface RegisterData {
  username: string
  password: string
  email: string
  nickname?: string
}

export interface LoginParams {
  username: string
  password: string
}

export interface AuthResponse {
  access_token: string
  user: {
    id: number
    username: string
    isAdmin: boolean
    points?: number
  }
}

/**
 * User account login
 */
export function loginWithAccount(data: LoginParams) {
  return request.post<AuthResponse>({ url: '/auth/login', data }, { errorMessageMode: 'none' })
}

/**
 * User register
 */
export function registerAccount(data: RegisterData) {
  return request.post<{ id: number; username: string }>({ url: '/auth/register', data }, { errorMessageMode: 'none' })
}

/**
 * Third-party OAuth login
 */
export function login(source: string, data: any) {
  return request.post<AuthResponse>({ url: `/auth/login/${source}`, data }, { errorMessageMode: 'none' })
}

/**
 * Login Support
 */
export function getLoginSupport() {
  return request.get<{ thirdParty: string[] }>({ url: '/auth/login/support' }, { errorMessageMode: 'none' })
}
