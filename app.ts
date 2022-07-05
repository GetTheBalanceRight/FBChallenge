import { DbServer } from './DbServer'

const io = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
})

let cmd: string = ''
let db: DbServer = new DbServer()

const cmd_begin = 'begin'
const cmd_end = 'end'
const cmd_rollback = 'rollback'
const cmd_commit = 'commit'
const cmd_set = 'set'
const cmd_get = 'get'
const cmd_unset = 'unset'
const cmd_numEqualTo = 'numequalto'

console.clear()
console.log('Welcome to the in-memory DB!\n\n\n')

function prompt(): void {
    io.question('> ', (input: string) => {
        const broken = input.split(' ')
        if (broken.length > 0) {
            let cmd = broken[0]?.toLowerCase()
            let variable = broken.length >= 1 ? broken[1] : ''
            let value = broken.length == 3 ? broken[2] : ''
            switch (cmd) {
                case cmd_end: {
                    console.log('\n\n\nGoodbye!\n\n\n\n')
                    io.close()
                    break;
                }
                case cmd_set: {
                    db.set(variable, value)
                    prompt()
                    break;
                }
                case cmd_get: {
                    const output = db.get(variable)
                    console.log(output ?? 'NULL')
                    prompt()
                    break;
                }
                case cmd_unset: {
                    db.unset(variable)
                    prompt()
                    break;
                }
                case cmd_numEqualTo: {
                    console.log(db.numEqualTo(variable))
                    prompt()
                    break;
                }
                case cmd_begin: {
                    db.begin()
                    prompt()
                    break;
                }
                case cmd_commit: {
                    db.commit()
                    prompt()
                    break;
                }
                case cmd_rollback: {
                    db.rollback()
                    prompt()
                    break;
                }
                default:
                    console.log(`Invalid command: ${cmd}`)
                    prompt()
                    break;
            }
        }
    })
}

prompt()
