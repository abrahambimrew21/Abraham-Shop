
export interface SyncQueue {
    id: number
    table: string
    entityId: any
    numericDeltas?: number
    propertyReplacements?: any
    operation: 'CREATE' | 'UPDATE' | 'DELETE'
    payload?: any // Send full object on creation
    clientId: string
    hlc: string
}