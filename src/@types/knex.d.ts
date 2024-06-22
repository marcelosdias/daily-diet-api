// eslint-disable-next-line
import { Knex } from 'knex'

declare module 'knex/types/tables' {
  interface Tables {
    users: {
      id: string
      name: string
      email: string
      sessions_id: string
    }
    meals: {
      id: string
      name: string
      description: string
      users_id: string
      is_on_diet: boolean
      date: number
    }
  }
}
