class DbOps {
    set(db: Map<string, any>, index: Map<string, string[]>, name: string, value: any) {
        // check for current index value:
        this.removeFromIndexIfExists(db, name, index)

        db.set(name, value)
        if (!!value) {
            let updIdx = index.get(value) ?? []
            if (!updIdx.includes(name)) {
                updIdx.push(name)
            }
            index.set(value, updIdx)
        }
    }

    private removeFromIndexIfExists(db: Map<string, any>, name: string, index: Map<string, string[]>) {
        const currVal = db.get(name)
        if (!!currVal) {
            const currIdx = index.get(currVal)
            currIdx?.splice(currIdx.indexOf(name))
            if (currIdx?.length === 0) {
                index.delete(currVal)
            }
        }
    }

    get(db: Map<string, any>, name: string) {
        return db.get(name)
    }

    unset(db: Map<string, any>, index: Map<string, string[]>, name: string): void {
        this.removeFromIndexIfExists(db, name, index)
        db.set(name, undefined)
    }

    numEqualTo(index: Map<any, string[]>, value: any): number {
        return index.get(value)?.length ?? 0
    }
}

class Transaction {
    child?: Transaction
    op: DbOps = new DbOps()
    data: Map<string, any>
    index: Map<string, string[]>

    constructor(deepCopy: Map<string, any>, childTx?: Transaction) {
        this.data = deepCopy
        this.child = childTx
        this.index = new Map<string, string[]>()
    }

    set(name: string, value: any) {
        this.child ? this.child.set(name, value) : this.op.set(this.data, this.index, name, value)
    }

    get(name: string): any {
        return this.child ? this.child.get(name) : this.op.get(this.data, name)
    }

    unset(name: string): void {
        this.child ? this.child.unset(name) : this.op.set(this.data, this.index, name, undefined)
    }

    numEqualTo(value: any): number {
        return this.child ? this.child.numEqualTo(value) : this.op.numEqualTo(this.index, value)
    }
}

export class DbServer {

    database: Map<string, any> = new Map<string, any>()
    index: Map<string, string[]> = new Map<string, string[]>()
    op: DbOps = new DbOps()

    constructor(private baseTransaction?: Transaction) { }

    begin() {
        if (!this.baseTransaction) {
            const deepCopy = new Map<string, any>(JSON.parse(JSON.stringify(Array.from(this.database))))
            this.baseTransaction = new Transaction(deepCopy)
        } else {
            // iterate through to find the last transaction
            let tx: Transaction | undefined = this.baseTransaction
            let currTx: Transaction | undefined = undefined
            do {
                currTx = tx?.child
                if (!!currTx) {
                    tx = currTx
                }
            } while (!!currTx)

            if (!!tx) {
                const deepCopy = new Map<string, any>(JSON.parse(JSON.stringify(Array.from(tx.data))))
                tx.child = new Transaction(deepCopy)
            }
        }
    }

    rollback() {
        if (!this.baseTransaction) {
            console.log('NO TRANSACTION')
            return
        }

        // iterate through to find the last transaction
        let parent: Transaction | undefined = this.baseTransaction
        let lastParent: Transaction | undefined = this.baseTransaction
        let child: Transaction | undefined = this.baseTransaction?.child
        if (parent === this.baseTransaction && !child) { // base transaction rollback:
            this.baseTransaction = undefined
        }
        while (!!child) {
            lastParent = parent
            parent = child
            child = parent.child
        }
        if (parent === this.baseTransaction) {
            this.baseTransaction = undefined
        } else {
            lastParent.child = undefined
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
        if (parent === this.baseTransaction && !child) { // base transaction commit:
            this.database = parent.data
            this.index = parent.index
            this.baseTransaction = undefined
            return
        }

        while (!!child) {
            lastParent = parent
            parent = child
            child = parent.child

            if (!parent?.child) {
                if (!!lastParent?.data) {
                    this.database = parent.data
                    this.index = parent.index
                    this.baseTransaction = undefined
                    break
                }
            }
        }

    }

    set(name: string, value: any) {
        this.baseTransaction ? this.baseTransaction.set(name, value) : this.op.set(this.database, this.index, name, value)
    }

    get(name: string) {
        return this.baseTransaction ? this.baseTransaction.get(name) : this.op.get(this.database, name)
    }

    unset(name: string): void {
        this.baseTransaction ? this.baseTransaction.unset(name) : this.op.set(this.database, this.index, name, undefined)
    }

    numEqualTo(value: any): number {
        return this.baseTransaction ? this.baseTransaction.numEqualTo(value) : this.op.numEqualTo(this.index, value)
    }

}