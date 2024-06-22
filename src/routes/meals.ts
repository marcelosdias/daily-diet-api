import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { checkSessionIdExists } from '../middlewares/check-session-id-exists'
import { knex } from '../database'
import { randomUUID } from 'crypto'

export async function mealRoutes(app: FastifyInstance) {
  app.addHook('preHandler', checkSessionIdExists)

  app.get('/', async (request, reply) => {
    const userId = request.user?.id

    const meals = await knex('meals')
      .where({ users_id: userId })
      .orderBy('date', 'desc')

    return reply.send({ meals })
  })

  app.get('/:mealId', async (request, reply) => {
    const paramsSchema = z.object({ mealId: z.string().uuid() })

    const { mealId } = paramsSchema.parse(request.params)

    const meal = await knex('meals').select().where({ id: mealId }).first()

    if (!meal) {
      return reply.status(404).send({ error: 'Meal not found' })
    }

    return reply.send({ meal })
  })

  app.post('/', async (request, reply) => {
    const createMealSchema = z.object({
      name: z.string(),
      description: z.string(),
      isOnDiet: z.boolean(),
      date: z.coerce.date(),
    })

    const { name, description, isOnDiet, date } = createMealSchema.parse(
      request.body,
    )

    const userId = request.user?.id

    await knex('meals').insert({
      id: randomUUID(),
      name,
      description,
      is_on_diet: isOnDiet,
      date: date.getTime(),
      users_id: userId,
    })

    return reply.status(201).send()
  })

  app.put('/:mealId', async (request, reply) => {
    const paramsSchema = z.object({
      mealId: z.string().uuid(),
    })

    const createMealSchema = z.object({
      name: z.string(),
      description: z.string(),
      isOnDiet: z.boolean(),
      date: z.coerce.date(),
    })

    const { mealId } = paramsSchema.parse(request.params)

    const { name, description, isOnDiet, date } = createMealSchema.parse(
      request.body,
    )

    await knex('meals')
      .update({
        name,
        description,
        is_on_diet: isOnDiet,
        date: date.getTime(),
      })
      .where({ id: mealId })

    return reply.status(204).send()
  })

  app.delete('/:mealId', async (request, reply) => {
    const paramsSchema = z.object({
      mealId: z.string().uuid(),
    })

    const { mealId } = paramsSchema.parse(request.params)

    await knex('meals').delete().where({ id: mealId })

    return reply.status(204).send()
  })

  app.get('/metrics', async (request, reply) => {
    const userId = request.user?.id

    const totalMeals = await knex('meals')
      .where({ users_id: userId })
      .orderBy('date', 'desc')

    const totalMealsOnDiet = await knex('meals')
      .where({ users_id: userId, is_on_diet: true })
      .count('id', { as: 'total' })
      .first()

    const totalMealsOffDiet = await knex('meals')
      .where({ users_id: userId, is_on_diet: false })
      .count('id', { as: 'total' })
      .first()

    const { bestOnDietSequence } = totalMeals.reduce(
      (acc, meal) => {
        if (meal.is_on_diet) {
          acc.currentSequence += 1
        } else {
          acc.currentSequence = 0
        }

        if (acc.currentSequence > acc.bestOnDietSequence) {
          acc.bestOnDietSequence = acc.currentSequence
        }

        return acc
      },
      { bestOnDietSequence: 0, currentSequence: 0 },
    )

    return reply.send({
      totalMeals: totalMeals.length,
      totalMealsOnDiet: totalMealsOnDiet?.total,
      totalMealsOffDiet: totalMealsOffDiet?.total,
      bestOnDietSequence,
    })
  })
}
