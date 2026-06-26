import 'axios'

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** When true, failed responses won't show a global toast (caller handles errors). */
    silent?: boolean
  }
}
