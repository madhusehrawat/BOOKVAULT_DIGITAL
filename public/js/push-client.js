
(async function initPushNotifications() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('[Push] Browser does not support Web Push.');
        return;
    }
    let registration;
    try {
        registration = await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
        console.log('[Push] Service Worker registered. Scope:', registration.scope);
    } catch (err) {
        console.error('[Push] Service Worker registration failed:', err);
        return;
    }
    await navigator.serviceWorker.ready;
    if (Notification.permission === 'denied') {
        console.log('[Push] Notifications blocked by user.');
        return;
    }
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
        await syncSubscriptionWithServer(existing);
        console.log('[Push] Already subscribed. Subscription synced.');
        return;
    }
    console.log('[Push] Ready to subscribe. Call askForPushPermission() on user gesture.');

})();

async function askForPushPermission() {
    try {
        const keyRes  = await fetch('/push/vapid-public-key', { credentials: 'include' });
        const keyData = await keyRes.json();

        if (!keyData.success || !keyData.publicKey) {
            console.error('[Push] Could not fetch VAPID public key.');
            showPushToast('Notification setup failed. Contact support.', 'error');
            return false;
        }

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly:true,
            applicationServerKey: urlBase64ToUint8Array(keyData.publicKey)
        });

        console.log('[Push] Subscribed:', subscription);
        const saved = await syncSubscriptionWithServer(subscription);
        if (saved) {
            showPushToast('✅ Notifications enabled!', 'success');
            updateBellUI(true);
            return true;
        }

    } catch (err) {
        if (err.name === 'NotAllowedError') {
            showPushToast('Notifications blocked. Enable them in browser settings.', 'warning');
        } else {
            console.error('[Push] Subscribe error:', err);
            showPushToast('Could not enable notifications.', 'error');
        }
        return false;
    }
}
async function disablePushNotifications() {
    try {
        const registration= await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            await subscription.unsubscribe();
        }
        await fetch('/push/unsubscribe', { method: 'POST', credentials: 'include' });
        showPushToast('Notifications disabled.', 'info');
        updateBellUI(false);
    } catch (err) {
        console.error('[Push] Unsubscribe error:', err);
    }
}

async function syncSubscriptionWithServer(subscription) {
    try {
        const res= await fetch('/push/subscribe', {
            method:'POST',
            credentials:'include',
            headers:{ 'Content-Type': 'application/json' },
            body:JSON.stringify({ subscription })
        });
        const data = await res.json();
        return data.success;
    } catch (err) {
        console.error('[Push] Failed to sync subscription with server:', err);
        return false;
    }
}


function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData= window.atob(base64);
    const array= new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
        array[i] = rawData.charCodeAt(i);
    }
    return array;
}

function updateBellUI(enabled) {
    const bell = document.getElementById('notificationBellBtn');
    if (!bell) return;
    if (enabled) {
        bell.classList.add('text-blue-600');
        bell.classList.remove('text-slate-400');
        bell.title = 'Notifications ON — click to disable';
        bell.setAttribute('onclick', 'disablePushNotifications()');
    } else {
        bell.classList.remove('text-blue-600');
        bell.classList.add('text-slate-400');
        bell.title = 'Enable notifications';
        bell.setAttribute('onclick', 'askForPushPermission()');
    }
}
function showPushToast(msg, type = 'info') {
    if (typeof Toastify !== 'undefined') {
        const colors = { success:'#2563eb', error:'#ef4444', warning:'#f59e0b', info:'#64748b' };
        Toastify({
            text: msg, duration: 4000,
            gravity: 'bottom', position: 'right',
            style: { background: colors[type], borderRadius: '12px', fontWeight: '700' }
        }).showToast();
    } else {
        console.log(`[Push Toast] ${type.toUpperCase()}: ${msg}`);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
        const reg = await navigator.serviceWorker.ready;
        const sub= await reg.pushManager.getSubscription();
        const perm = Notification.permission;
        updateBellUI(!!sub && perm === 'granted');
    } catch (e) {}
});