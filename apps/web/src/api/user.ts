import request from '../utils/http'

export interface UserProfile {
  id: string
  username: string
  nickname?: string
  avatar?: string
  isAdmin: boolean
  points: number
  createdAt: string
}

/**
 * Get current user profile
 */
export function getUserProfile() {
  return request.get<UserProfile>({ url: '/users/profile' })
}

/**
 * Get user profile by username
 */
export function getUser(username: string) {
  return request.get<UserProfile>({ url: `/users/${username}` })
}
