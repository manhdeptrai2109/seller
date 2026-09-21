// Chú thích: seller.js - logic web seller

const API_BASE    = "https://tmanhios.pretty-pilot.workers.dev";
const API_LOGIN   = API_BASE + "/seller/login";
const API_QUOTA   = API_BASE + "/seller/quota";
const API_CREATE  = API_BASE + "/seller/create";
const API_KEYS    = API_BASE + "/seller/keys";
const API_DELETE  = API_BASE + "/seller/delete";

let currentUser = null;
let totalKeys = 0;

// ============================================================
// Chú thích: kiểm tra session
// ============================================================
function checkAuth() {
    const user = localStorage.getItem("seller_user");
    const pass = localStorage.getItem("seller_pass");
    if (!user || !pass) {
        if (window.location.pathname.indexOf("seller.html") !== -1) {
            window.location.href = "index.html";
        }
        return false;
    }
    currentUser = user;
    return true;
}

async function apiCall(url, params) {
    const form = new FormData();
    for (const k in params) form.append(k, params[k]);
    try {
        const r = await fetch(url, { method: "POST", body: form });
        return await r.json();
    } catch (e) {
        return { status: "error", msg: "network_fail" };
    }
}

// ============================================================
// Chú thích: LOGIN PAGE
// ============================================================
function initLoginPage() {
    const $btnLogin = document.getElementById("btn-login");
    const $user = document.getElementById("username");
    const $pass = document.getElementById("password");
    const $msg = document.getElementById("msg");

    if (!$btnLogin) return;

    if (checkAuth()) { window.location.href = "seller.html"; return; }

    $btnLogin.addEventListener("click", async () => {
        const user = $user.value.trim().toLowerCase();
        const password = $pass.value.trim();

        if (!user || !password) {
            $msg.textContent = "Nhập đầy đủ thông tin";
            $msg.style.color = "#ff2b2b";
            return;
        }

        $msg.textContent = "Đang đăng nhập...";
        $msg.style.color = "#ffcc00";

        const j = await apiCall(API_LOGIN, { username: user, password: password });

        if (j.status === "ok") {
            localStorage.setItem("seller_user", user);
            localStorage.setItem("seller_pass", password);
            localStorage.setItem("seller_prefix", j.prefix || "TManhios-");
            localStorage.setItem("seller_brand", j.brand || "TMANHIOS SELLER");
            localStorage.setItem("seller_expiredAt", j.expiredAt || "0");
            $msg.textContent = "Đăng nhập thành công! Đang chuyển...";
            $msg.style.color = "#00ff7f";
            setTimeout(() => { window.location.href = "seller.html"; }, 500);
        } else {
            const errMap = {
                "not_found": "Tài khoản không tồn tại",
                "wrong_password": "Sai mật khẩu",
                "disabled": "Tài khoản đã bị khóa",
                "rental_expired": "Đã hết hạn thuê — liên hệ admin"
            };
            $msg.textContent = errMap[j.msg] || ("Lỗi: " + j.msg);
            $msg.style.color = "#ff2b2b";
        }
    });

    $pass.addEventListener("keydown", (e) => {
        if (e.key === "Enter") $btnLogin.click();
    });
}

// ============================================================
// Chú thích: DASHBOARD PAGE
// ============================================================
function initDashboardPage() {
    const $usernameDisplay = document.getElementById("username-display");
    if (!$usernameDisplay) return;

    if (!checkAuth()) return;
    $usernameDisplay.textContent = currentUser;

    const myPrefix = localStorage.getItem("seller_prefix") || "TManhios-";
    const $myPrefix = document.getElementById("my-prefix");
    if ($myPrefix) $myPrefix.textContent = myPrefix;

    // Chú thích: đổi tiêu đề theo brand
    const myBrand = localStorage.getItem("seller_brand") || "TMANHIOS SELLER";
    const $brandTitle = document.getElementById("brand-title");
    if ($brandTitle) $brandTitle.textContent = myBrand;
    document.title = myBrand + " - Seller";

    // Chú thích: hiển thị hạn thuê
    const expiredAt = parseInt(localStorage.getItem("seller_expiredAt") || "0");
    const $rentalInfo = document.getElementById("rental-info");
    if ($rentalInfo && expiredAt > 0) {
        const remain = expiredAt - Date.now();
        if (remain <= 0) {
            $rentalInfo.textContent = "ĐÃ HẾT HẠN THUÊ";
            $rentalInfo.style.color = "#ff2b2b";
        } else {
            const days = Math.floor(remain / 86400000);
            const dateStr = new Date(expiredAt).toLocaleDateString("vi-VN");
            $rentalInfo.textContent = `Hạn thuê: ${dateStr} (còn ${days} ngày)`;
            $rentalInfo.style.color = days <= 7 ? "#ffcc00" : "#00ff7f";
        }
    }

    const $duration   = document.getElementById("duration");
    const $btnCreate  = document.getElementById("btn-create");
    const $btnCopy    = document.getElementById("btn-copy");
    const $btnClear   = document.getElementById("btn-clear");
    const $result     = document.getElementById("result");
    const $msg        = document.getElementById("msg");
    const $btnReload  = document.getElementById("btn-reload");
    const $search     = document.getElementById("search");
    const $keyBody    = document.getElementById("key-body");
    const $total      = document.getElementById("total");

    async function refreshQuota() {
        const j = await apiCall(API_QUOTA, { username: currentUser });
        if (j.status !== "ok") {
            if (j.msg === "disabled" || j.msg === "rental_expired" || j.msg === "not_found") {
                alert("Tài khoản đã bị khóa hoặc hết hạn. Đăng xuất...");
                localStorage.clear();
                window.location.href = "index.html";
            }
            return;
        }
        document.getElementById("quota-used").textContent = j.used;
        document.getElementById("quota-limit").textContent = j.limit;
        document.getElementById("quota-remain").textContent = j.remain;

        const pct = Math.min(100, (j.used / j.limit) * 100);
        const $fill = document.getElementById("progress-fill");
        $fill.style.width = pct + "%";
        if (pct >= 100) $fill.style.background = "#ff2b2b";
        else if (pct >= 80) $fill.style.background = "#ffcc00";
        else $fill.style.background = "#00ff7f";

        // Chú thích: cập nhật hạn thuê nếu có
        if (j.expiredAt) {
            localStorage.setItem("seller_expiredAt", j.expiredAt);
            const remain = j.expiredAt - Date.now();
            if ($rentalInfo) {
                if (remain <= 0) {
                    $rentalInfo.textContent = "ĐÃ HẾT HẠN THUÊ";
                    $rentalInfo.style.color = "#ff2b2b";
                } else {
                    const days = Math.floor(remain / 86400000);
                    const dateStr = new Date(j.expiredAt).toLocaleDateString("vi-VN");
                    $rentalInfo.textContent = `Hạn thuê: ${dateStr} (còn ${days} ngày)`;
                    $rentalInfo.style.color = days <= 7 ? "#ffcc00" : "#00ff7f";
                }
            }
        }
    }

    $btnCreate.addEventListener("click", async () => {
        const dur = $duration.value;
        const oldText = $btnCreate.textContent;
        $btnCreate.textContent = "ĐANG TẠO...";
        $btnCreate.disabled = true;

        const j = await apiCall(API_CREATE, { username: currentUser, duration: dur });

        if (j.status === "ok") {
            const oldTextArea = $result.value;
            if (oldTextArea.trim() === "") $result.value = j.key;
            else $result.value = oldTextArea + "\n" + j.key;
            $msg.textContent = "Tạo key thành công!";
            $msg.style.color = "#00ff7f";
            totalKeys++;
            $total.textContent = totalKeys;
            await refreshQuota();
            await loadKeys();
        } else if (j.msg === "quota_exceeded") {
            $msg.textContent = "Đã hết quota 100 key/ngày!";
            $msg.style.color = "#ff2b2b";
        } else if (j.msg === "disabled") {
            $msg.textContent = "Tài khoản đã bị khóa";
            $msg.style.color = "#ff2b2b";
        } else if (j.msg === "rental_expired") {
            $msg.textContent = "Đã hết hạn thuê";
            $msg.style.color = "#ff2b2b";
        } else {
            $msg.textContent = "Lỗi: " + (j.msg || "unknown");
            $msg.style.color = "#ff2b2b";
        }

        $btnCreate.textContent = oldText;
        $btnCreate.disabled = false;
    });

    $btnCopy.addEventListener("click", () => {
        if (!$result.value) return;
        navigator.clipboard.writeText($result.value).then(() => {
            const old = $btnCopy.textContent;
            $btnCopy.textContent = "ĐÃ COPY";
            setTimeout(() => { $btnCopy.textContent = old; }, 1200);
        });
    });

    $btnClear.addEventListener("click", () => {
        $result.value = "";
        totalKeys = 0;
        $total.textContent = 0;
    });

    function formatRemain(item) {
        if (!item.activatedAt) return "CHƯA DÙNG";
        const dur = getDurationMs(item.key);
        if (dur === 0) return "∞";
        const remain = (item.activatedAt + dur) - Date.now();
        if (remain <= 0) return "HẾT HẠN";
        const totalSec = Math.floor(remain / 1000);
        const d = Math.floor(totalSec / 86400);
        const h = Math.floor((totalSec % 86400) / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        if (d > 0) return `${d}N ${h}H ${m}M`;
        return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
    }

    function getDurationMs(key) {
        if (key.indexOf("-1hour-")  !== -1) return 3600000;
        if (key.indexOf("-1day-")   !== -1) return 86400000;
        if (key.indexOf("-7day-")   !== -1) return 604800000;
        if (key.indexOf("-1month-") !== -1) return 2592000000;
        return 86400000;
    }

    function getDurationLabel(key) {
        if (key.indexOf("-1hour-")  !== -1) return "1 GIỜ";
        if (key.indexOf("-1day-")   !== -1) return "1 NGÀY";
        if (key.indexOf("-7day-")   !== -1) return "7 NGÀY";
        if (key.indexOf("-1month-") !== -1) return "1 THÁNG";
        return "N/A";
    }

    function formatTime(ts) {
        return new Date(ts).toLocaleString("vi-VN");
    }

    async function loadKeys() {
        const j = await apiCall(API_KEYS, { username: currentUser });
        if (j.status !== "ok") { $keyBody.innerHTML = ""; return; }

        const filter = $search.value.toLowerCase();
        let keys = j.keys || [];
        if (filter) keys = keys.filter(k => k.key.toLowerCase().includes(filter));
        keys.sort((a, b) => b.createdAt - a.createdAt);

        $keyBody.innerHTML = "";
        const now = Date.now();

        keys.forEach((item, idx) => {
            const tr = document.createElement("tr");
            const tdStt = document.createElement("td"); tdStt.textContent = idx + 1;
            const tdKey = document.createElement("td"); tdKey.className = "key-cell"; tdKey.textContent = item.key;
            const tdType = document.createElement("td"); tdType.className = "type-cell";
            tdType.textContent = getDurationLabel(item.key);
            const tdCreated = document.createElement("td"); tdCreated.textContent = formatTime(item.createdAt);

            const tdStatus = document.createElement("td");
            tdStatus.textContent = formatRemain(item);
            if (!item.activatedAt) tdStatus.className = "not-used";
            else if (item.activatedAt + getDurationMs(item.key) - now <= 0) tdStatus.className = "expired";
            else tdStatus.className = "active";

            const tdAct = document.createElement("td");
            const btnDel = document.createElement("button");
            btnDel.className = "btn-del";
            btnDel.textContent = "XÓA";
            btnDel.addEventListener("click", async () => {
                if (!confirm("Xóa key này?")) return;
                btnDel.textContent = "...";
                btnDel.disabled = true;
                const r = await apiCall(API_DELETE, { username: currentUser, key: item.key });
                if (r.status === "ok") loadKeys();
                else { alert("Lỗi xóa key"); btnDel.textContent = "XÓA"; btnDel.disabled = false; }
            });
            tdAct.appendChild(btnDel);

            tr.appendChild(tdStt); tr.appendChild(tdKey); tr.appendChild(tdType);
            tr.appendChild(tdCreated); tr.appendChild(tdStatus); tr.appendChild(tdAct);
            $keyBody.appendChild(tr);
        });

        $total.textContent = keys.length;
    }

    $btnReload.addEventListener("click", loadKeys);
    $search.addEventListener("input", loadKeys);

    document.getElementById("btn-logout").addEventListener("click", (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = "index.html";
    });

    refreshQuota();
    loadKeys();
    setInterval(refreshQuota, 30000);
    setInterval(loadKeys, 10000);
}

// ============================================================
// Chú thích: hiệu ứng chấm đỏ
// ============================================================
document.addEventListener("click", (e) => {
    const dot = document.createElement("div");
    dot.className = "click-dot";
    dot.style.left = e.clientX + "px";
    dot.style.top  = e.clientY + "px";
    document.body.appendChild(dot);
    setTimeout(() => dot.remove(), 3000);
});

initLoginPage();
initDashboardPage();
