
let lastPhys = 0;
let lastCounter = 0;

// Persistent unique ID for this specific device/browser
export function getClientId() {
    let id = localStorage.getItem('app_client_id');
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem('app_client_id', id);
    }
    return id;
}

// Generate Hybrid Logical Clock timestamp
export function generateHLC(remoteHlcString: string | null = null) {
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