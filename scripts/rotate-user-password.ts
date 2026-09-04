#!/usr/bin/env node
// Rotate user password - Generic script for Eric or Lilian
// Keep this script for long-term password management

import { config } from 'dotenv'
import { resolve } from 'path'
import bcrypt from 'bcryptjs'
import { getUserByEmail } from '../lib/airtable/client'
import * as readline from 'readline/promises'
import { stdin as input, stdout as output } from 'process'

config({ path: resolve(process.cwd(), '.env.local') })

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID
const TABLE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/USERS`

const rl = readline.createInterface({ input, output, terminal: true })

const USERS = [
  { id: 1, name: 'Eric', email: 'eric@kls3-dev.com' },
  { id: 2, name: 'Lilian', email: 'lilian@kls3-dev.com' },
]

function hiddenQuestion(query: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin
    const stdout = process.stdout

    stdout.write(query)

    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')

    let password = ''
    const onData = (char: string) => {
      char = char.toString()

      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.setRawMode(false)
          stdin.pause()
          stdin.removeListener('data', onData)
          stdout.write('\n')
          resolve(password)
          break
        case '\u0003':
          process.exit()
          break
        case '\u007f':
          if (password.length > 0) {
            password = password.slice(0, -1)
            stdout.clearLine(0)
            stdout.cursorTo(0)
            stdout.write(query)
          }
          break
        default:
          password += char
          break
      }
    }

    stdin.on('data', onData)
  })
}

async function updateUserPassword(recordId: string, passwordHash: string) {
  const now = new Date().toISOString()

  const response = await fetch(`${TABLE_URL}/${recordId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${AIRTABLE_TOKEN!}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        'Password Hash': passwordHash,
        'Updated At': now,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to update password: ${response.statusText}`)
  }

  return response.json()
}

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('ROTATE USER PASSWORD')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  console.log('Quel utilisateur ?\n')
  USERS.forEach((user) => {
    console.log(`${user.id}. ${user.name}`)
  })

  const choice = await rl.question('\nChoix (1 ou 2): ')
  const selectedUser = USERS.find((u) => u.id === parseInt(choice))

  if (!selectedUser) {
    console.log('\n❌ Choix invalide')
    rl.close()
    return
  }

  console.log(`\nUtilisateur sélectionné: ${selectedUser.name}\n`)

  console.log('Fetching user from Airtable...')
  const user = await getUserByEmail(selectedUser.email)

  if (!user) {
    console.log(`❌ ${selectedUser.name} not found in USERS table`)
    rl.close()
    return
  }

  console.log('✅ User found\n')
  console.log(`Name: ${user.name}`)
  console.log(`Email: ${user.email}`)
  console.log(`Role: ${user.role}\n`)

  const newPassword = await hiddenQuestion('Nouveau mot de passe (min 8 chars): ')

  if (!newPassword || newPassword.length < 8) {
    console.log('\n❌ Le mot de passe doit contenir au moins 8 caractères')
    rl.close()
    return
  }

  const confirmPassword = await hiddenQuestion('Confirmer le mot de passe: ')

  if (newPassword !== confirmPassword) {
    console.log('\n❌ Les mots de passe ne correspondent pas')
    rl.close()
    return
  }

  console.log('\n✅ Mots de passe correspondent\n')

  console.log('Generating bcrypt hash...')
  const newHash = bcrypt.hashSync(newPassword, 10)
  console.log('✅ Hash generated\n')

  console.log('Updating password in Airtable...')
  await updateUserPassword(user.id, newHash)
  console.log('✅ Password updated\n')

  console.log('Re-fetching user to validate...')
  const updatedUser = await getUserByEmail(selectedUser.email)

  if (!updatedUser) {
    console.log('❌ Validation failed')
    rl.close()
    return
  }

  console.log('Testing bcrypt.compare()...')
  const bcryptMatch = await bcrypt.compare(newPassword, updatedUser.passwordHash)

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('VALIDATION')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  console.log(`User found: ${!!updatedUser}`)
  console.log(`Role: ${updatedUser.role}`)
  console.log(`Active: ${updatedUser.active}`)
  console.log(`Password updated: true`)
  console.log(`bcryptCompare: ${bcryptMatch}\n`)

  if (bcryptMatch) {
    console.log(`✅ Password rotation successful for ${selectedUser.name}`)
    console.log(`✅ ${selectedUser.name} can now login with new password\n`)
  } else {
    console.log('❌ Validation failed\n')
  }

  rl.close()
}

main().catch((error) => {
  console.error('\n❌ Error:', error.message)
  rl.close()
  process.exit(1)
})
