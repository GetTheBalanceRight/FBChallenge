class DbOps {
    set(db: Map<string, any>, name: string, value: any) {
        db.set(name, value)
    }

    get(db: Map<string, any>, name: string) {
        return db.get(name)
    }

    unset(db: Map<string, any>, name: string): void {
        db.set(name, undefined)
    }

    numEqualTo(db: Map<string, any>, value: any): number {
        let output = 0
        db.forEach(val => {
            if (val === value) {
                output++
            }
        });

        return output
    }
}

class Transaction {
    child?: Transaction
    op: DbOps = new DbOps()
    data: Map<string, any>

    constructor(deepCopy: Map<string, any>, childTx?: Transaction) {
        this.data = deepCopy
        this.child = childTx
    }

    set(name: string, value: any) {
        this.child ? this.child.set(name, value) : this.op.set(this.data, name, value)
    }

    get(name: string): any {
        return this.child ? this.child.get(name) : this.op.get(this.data, name)
    }

    unset(name: string): void {
        this.child ? this.child.unset(name) : this.op.set(this.data, name, undefined)
    }

    numEqualTo(value: any): number {
        return this.child ? this.child.numEqualTo(value) : this.op.numEqualTo(this.data, value)
    }
}

export class DbServer {

    database: Map<string, any> = new Map<string, any>()
    op: DbOps = new DbOps()

    constructor(private baseTransaction?: Transaction) { }

    begin() {
        const deepCopy = new Map<string, any>(JSON.parse(JSON.stringify(Array.from(this.database))))
        if (!this.baseTransaction) {
            this.baseTransaction = new Transaction(deepCopy)
        } else {
            // iterate through to find the last transaction
            let tx: Transaction | undefined = this.baseTransaction.child
            let currTx: Transaction | undefined = undefined
            do {
                currTx = tx?.child
                if (!!currTx) {
                    tx = currTx
                }
            } while (!!currTx)

            if (!!tx) {
                tx.child = new Transaction(deepCopy)
            }
        }
    }

    rollback() {
        console.log('this.baseTx', this.baseTransaction)
        if (!this.baseTransaction) {
            console.log('NO TRANSACTION')
            return
        }

        // iterate through to find the last transaction
        let parentTx: Transaction | undefined = this.baseTransaction
        let childTx: Transaction | undefined = undefined
        do {
            childTx = parentTx?.child
            if (!!childTx) {
                parentTx = childTx
            }
        } while (!!childTx)

        if (!!parentTx) {
            parentTx.child = undefined // not doing anything with the changes
        }

    }

    commit() {
        if (!this.baseTransaction) {
            console.log('NO TRANSACTION')
            return
        }

        // iterate through to find the last transaction
        let parent: Transaction | undefined = this.baseTransaction
        let lastParent: Transaction | undefined = this.baseTransaction
        let child: Transaction | undefined = this.baseTransaction?.child
        while (!!child) {
            if (!parent.child) {
                if (parent === this.baseTransaction) {
                    this.database = parent.data
                } else {
                    lastParent.data = parent.data
                }
            }
            lastParent = parent
            parent = child
            child = parent.child
        }

    }

    set(name: string, value: any) {
        this.baseTransaction ? this.baseTransaction.set(name, value) : this.op.set(this.database, name, value)
    }

    get(name: string) {
        return this.baseTransaction ? this.baseTransaction.get(name) : this.op.get(this.database, name)
    }

    unset(name: string): void {
        this.baseTransaction ? this.baseTransaction.unset(name) : this.op.set(this.database, name, undefined)
    }

    numEqualTo(value: any): number {
        return this.baseTransaction ? this.baseTransaction.numEqualTo(value) : this.op.numEqualTo(this.database, value)
    }

}