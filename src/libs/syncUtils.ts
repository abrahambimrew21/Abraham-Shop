
let lastPhys = 0;
let lastCounter = 0;
let memoryClientId: string | null = null;

// Persistent unique ID for this specific client session (uses sessionStorage so multiple tabs act as separate clients)
export function getClientId(): string {
    if (typeof sessionStorage !== 'undefined') {
        let id = sessionStorage.getItem('app_client_id');
        if (!id) {
            id = crypto.randomUUID();
            sessionStorage.setItem('app_client_id', id);
        }
        return id;
    }

    if (typeof localStorage !== 'undefined') {
        let id = localStorage.getItem('app_client_id');
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem('app_client_id', id);
        }
        return id;
    }

    if (!memoryClientId) {
        memoryClientId = crypto.randomUUID();
    }
    return memoryClientId;
}

// Generate Hybrid Logical Clock timestamp
export function generateHLC(remoteHlcString: string | null = null): string {
    const nodeId = getClientId();
    let now = Date.now();

    let remotePhys = 0;
    let remoteCounter = 0;

    if (remoteHlcString) {
        const [p, c] = remoteHlcString.split(':');
        remotePhys = parseInt(p, 10) || 0;
        remoteCounter = parseInt(c, 10) || 0;
    }

    const phys = Math.max(now, lastPhys, remotePhys);

    if (phys === lastPhys && phys === remotePhys) {
        lastCounter = Math.max(lastCounter, remoteCounter) + 1;
    } else if (phys === lastPhys) {
        lastCounter++;
    } else if (phys === remotePhys) {
        lastCounter = remoteCounter + 1;
    } else {
        lastCounter = 0;
    }

    lastPhys = phys;
    const counterStr = lastCounter.toString().padStart(4, '0');
    return `${phys}:${counterStr}:${nodeId}`;
}

// Advance local HLC when a remote message is received
export function updateHLC(remoteHlcString: string | null = null): void {
    if (!remoteHlcString) return;
    generateHLC(remoteHlcString);
}

// Deterministically compare two HLC timestamps
export function compareHLC(hlc1?: string | null, hlc2?: string | null): number {
    if (!hlc1 && !hlc2) return 0;
    if (!hlc1) return -1;
    if (!hlc2) return 1;

    const [p1, c1, n1] = hlc1.split(':');
    const [p2, c2, n2] = hlc2.split(':');

    const physDiff = (parseInt(p1, 10) || 0) - (parseInt(p2, 10) || 0);
    if (physDiff !== 0) return physDiff;

    const countDiff = (parseInt(c1, 10) || 0) - (parseInt(c2, 10) || 0);
    if (countDiff !== 0) return countDiff;

    return (n1 || '').localeCompare(n2 || '');
}