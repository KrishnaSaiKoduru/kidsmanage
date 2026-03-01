"""
KidsManage — Streamlit Admin Dashboard
=======================================
A lightweight Python dashboard that connects to the KidsManage backend API.
Run: streamlit run streamlit_app.py

NOTE: This is a companion dashboard, not a replacement for the React frontend.
The main application runs as:
  - Frontend: React + Vite (npm run dev in /frontend)
  - Backend: Node.js + Express (npx ts-node-dev src/index.ts in /backend)
"""

import streamlit as st
import requests
import datetime
import json

# ─── Configuration ────────────────────────────────────────────────────────

st.set_page_config(
    page_title="KidsManage Dashboard",
    page_icon="🧸",
    layout="wide",
    initial_sidebar_state="expanded",
)

API_BASE = st.sidebar.text_input("Backend API URL", value="http://localhost:3001/api")
SUPABASE_URL = st.sidebar.text_input("Supabase URL", value="")
SUPABASE_ANON_KEY = st.sidebar.text_input("Supabase Anon Key", value="", type="password")

# ─── Auth State ───────────────────────────────────────────────────────────

if "token" not in st.session_state:
    st.session_state.token = None
if "user" not in st.session_state:
    st.session_state.user = None


def api_get(path):
    """GET request to backend with auth header."""
    headers = {}
    if st.session_state.token:
        headers["Authorization"] = f"Bearer {st.session_state.token}"
    try:
        r = requests.get(f"{API_BASE}{path}", headers=headers, timeout=10)
        if r.status_code == 200:
            return r.json()
        else:
            st.error(f"API Error ({r.status_code}): {r.text}")
            return None
    except requests.exceptions.ConnectionError:
        st.error("❌ Cannot connect to backend. Make sure the backend is running on the configured URL.")
        return None
    except Exception as e:
        st.error(f"Request failed: {e}")
        return None


def api_post(path, data):
    """POST request to backend with auth header."""
    headers = {"Content-Type": "application/json"}
    if st.session_state.token:
        headers["Authorization"] = f"Bearer {st.session_state.token}"
    try:
        r = requests.post(f"{API_BASE}{path}", headers=headers, json=data, timeout=10)
        if r.status_code in (200, 201):
            return r.json()
        else:
            st.error(f"API Error ({r.status_code}): {r.text}")
            return None
    except requests.exceptions.ConnectionError:
        st.error("❌ Cannot connect to backend.")
        return None
    except Exception as e:
        st.error(f"Request failed: {e}")
        return None


def login_via_supabase(email, password):
    """Authenticate via Supabase REST API and get JWT token."""
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        st.error("Please configure Supabase URL and Anon Key in the sidebar.")
        return False

    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
    }
    payload = {"email": email, "password": password}

    try:
        r = requests.post(url, headers=headers, json=payload, timeout=10)
        if r.status_code == 200:
            data = r.json()
            st.session_state.token = data.get("access_token")
            # Fetch user profile from backend
            user = api_get("/auth/me")
            if user:
                st.session_state.user = user
                return True
        else:
            err = r.json()
            st.error(f"Login failed: {err.get('error_description', err.get('msg', 'Unknown error'))}")
    except Exception as e:
        st.error(f"Login error: {e}")

    return False


# ─── Sidebar ──────────────────────────────────────────────────────────────

st.sidebar.title("🧸 KidsManage")
st.sidebar.caption("Admin Dashboard")
st.sidebar.divider()

if not st.session_state.token:
    st.sidebar.subheader("🔐 Login")
    with st.sidebar.form("login_form"):
        email = st.text_input("Email")
        password = st.text_input("Password", type="password")
        submitted = st.form_submit_button("Sign In", use_container_width=True)
        if submitted and email and password:
            with st.spinner("Authenticating..."):
                if login_via_supabase(email, password):
                    st.rerun()
else:
    user = st.session_state.user or {}
    st.sidebar.success(f"Logged in as **{user.get('name', 'User')}**")
    st.sidebar.caption(f"Role: {user.get('role', 'N/A')} · Center: {user.get('center', {}).get('name', 'N/A')}")
    if st.sidebar.button("🚪 Logout", use_container_width=True):
        st.session_state.token = None
        st.session_state.user = None
        st.rerun()

st.sidebar.divider()
st.sidebar.markdown(
    "**Note:** This Streamlit dashboard connects to the KidsManage backend API. "
    "The full application (React frontend) runs separately."
)

# ─── Main Content ─────────────────────────────────────────────────────────

if not st.session_state.token:
    # Landing page when not logged in
    st.title("🧸 KidsManage")
    st.subheader("Childcare Center Management Platform")
    st.markdown("---")

    col1, col2, col3 = st.columns(3)
    with col1:
        st.markdown("### 📊 Dashboard")
        st.write("Central overview of your center's operations, attendance, and alerts.")
    with col2:
        st.markdown("### 📅 Activities")
        st.write("Schedule and track daily activities with per-student completion tracking.")
    with col3:
        st.markdown("### 🕐 Attendance")
        st.write("Digital check-in/check-out with historical records and calendar navigation.")

    col4, col5, col6 = st.columns(3)
    with col4:
        st.markdown("### 👶 Enrollment")
        st.write("Manage enrollment applications, waitlists, and student records.")
    with col5:
        st.markdown("### 💳 Billing")
        st.write("Invoicing with Stripe payments, tax calculation, and late fee automation.")
    with col6:
        st.markdown("### 💬 Messages")
        st.write("Secure messaging between staff and parents with conversation threads.")

    st.markdown("---")
    st.info("👈 **Login from the sidebar** to access the dashboard. Make sure the backend is running.")
    st.stop()

# ─── Authenticated Dashboard ─────────────────────────────────────────────

user = st.session_state.user or {}
role = user.get("role", "PARENT")

tab_names = ["📊 Dashboard", "📅 Activities", "🕐 Attendance"]
if role in ("ADMIN", "CARETAKER"):
    tab_names.extend(["👶 Children", "💳 Billing"])

tabs = st.tabs(tab_names)

# ─── Tab: Dashboard ──────────────────────────────────────────────────────

with tabs[0]:
    st.header("📊 Dashboard Overview")
    dashboard = api_get("/dashboard")

    if dashboard:
        c1, c2, c3, c4 = st.columns(4)
        stats = dashboard if isinstance(dashboard, dict) else {}
        c1.metric("Total Children", stats.get("totalChildren", 0))
        c2.metric("Present Today", stats.get("presentToday", 0))
        c3.metric("Activities Today", stats.get("activitiesToday", 0))
        c4.metric("Pending Invoices", stats.get("pendingInvoices", 0))
    else:
        st.warning("Could not load dashboard data.")

# ─── Tab: Activities ─────────────────────────────────────────────────────

with tabs[1]:
    st.header("📅 Daily Activities")

    sel_date = st.date_input("Select Date", value=datetime.date.today())
    date_str = sel_date.strftime("%Y-%m-%d")

    activities = api_get(f"/activities?date={date_str}")

    if activities and isinstance(activities, list):
        st.info(f"**{len(activities)}** activities scheduled for **{sel_date.strftime('%A, %b %d, %Y')}**")

        for act in activities:
            completions = act.get("completions", [])
            total = len(completions)
            done = sum(1 for c in completions if c.get("completed"))
            progress = done / total if total > 0 else 0

            with st.expander(
                f"{'✅' if total > 0 and done == total else '📝'} **{act['title']}** ({act.get('category', 'Custom')}) — {done}/{total} done",
                expanded=False,
            ):
                col_a, col_b = st.columns([2, 1])
                with col_a:
                    st.write(f"**Category:** {act.get('category', 'N/A')}")
                    if act.get("scheduledTime"):
                        st.write(f"**Time:** {act['scheduledTime']}")
                with col_b:
                    st.progress(progress, text=f"{int(progress * 100)}% complete")

                if completions:
                    st.markdown("**Students:**")
                    for comp in completions:
                        child = comp.get("child", {})
                        name = f"{child.get('firstName', '')} {child.get('lastName', '')}"
                        status = "✅ Done" if comp.get("completed") else "⏳ Pending"
                        room = child.get("room", "")
                        st.write(f"- {name} {f'({room})' if room else ''} — {status}")
    elif activities is not None:
        st.info("No activities scheduled for this date.")

# ─── Tab: Attendance ─────────────────────────────────────────────────────

with tabs[2]:
    st.header("🕐 Attendance")

    att_date = st.date_input("Select Date", value=datetime.date.today(), key="att_date")
    att_date_str = att_date.strftime("%Y-%m-%d")

    endpoint = "/attendance/my-children" if role == "PARENT" else "/attendance/today"
    attendance = api_get(f"{endpoint}?date={att_date_str}")

    if attendance and isinstance(attendance, dict):
        summary = attendance.get("summary", {})
        c1, c2, c3 = st.columns(3)
        c1.metric("Present", summary.get("present", 0), delta=None)
        c2.metric("Checked Out", summary.get("checkedOut", 0))
        c3.metric("Absent", summary.get("absent", 0))

        st.subheader("Roster")

        # Present
        present = attendance.get("present", [])
        if present:
            st.markdown("**✅ Present:**")
            for r in present:
                child = r.get("child", {})
                name = f"{child.get('firstName', '')} {child.get('lastName', '')}"
                checkin = r.get("checkIn", "")
                if checkin:
                    try:
                        checkin = datetime.datetime.fromisoformat(checkin.replace("Z", "+00:00")).strftime("%I:%M %p")
                    except Exception:
                        pass
                st.write(f"- 🟢 {name} — checked in at {checkin}")

        # Checked Out
        checked_out = attendance.get("checkedOut", [])
        if checked_out:
            st.markdown("**🟡 Checked Out:**")
            for r in checked_out:
                child = r.get("child", {})
                name = f"{child.get('firstName', '')} {child.get('lastName', '')}"
                st.write(f"- 🟡 {name}")

        # Absent
        absent = attendance.get("absent", [])
        if absent:
            st.markdown("**🔴 Absent:**")
            for c in absent:
                name = f"{c.get('firstName', '')} {c.get('lastName', '')}"
                st.write(f"- 🔴 {name}")
    elif attendance is not None:
        st.info("No attendance data for this date.")

# ─── Tab: Children (Admin/Caretaker only) ────────────────────────────────

if role in ("ADMIN", "CARETAKER") and len(tabs) > 3:
    with tabs[3]:
        st.header("👶 Enrolled Children")
        children = api_get("/children")

        if children and isinstance(children, list):
            st.info(f"**{len(children)}** children enrolled")

            for child in children:
                name = f"{child['firstName']} {child['lastName']}"
                room = child.get("room", "Unassigned")
                status = child.get("status", "ENROLLED")
                parents = ", ".join(
                    pc.get("parent", {}).get("name", "")
                    for pc in child.get("parentChildren", [])
                )
                st.write(f"- **{name}** — Room: {room} | Status: {status}" + (f" | Parents: {parents}" if parents else ""))
        elif children is not None:
            st.info("No children enrolled.")

# ─── Tab: Billing (Admin/Caretaker only) ─────────────────────────────────

if role in ("ADMIN", "CARETAKER") and len(tabs) > 4:
    with tabs[4]:
        st.header("💳 Billing & Invoices")
        invoices = api_get("/billing/invoices")

        if invoices and isinstance(invoices, list):
            st.info(f"**{len(invoices)}** invoices found")

            status_emoji = {
                "PAID": "✅",
                "SENT": "📤",
                "DRAFT": "📝",
                "OVERDUE": "🔴",
                "CANCELLED": "❌",
            }

            for inv in invoices:
                emoji = status_emoji.get(inv.get("status", ""), "📋")
                child_name = ""
                if inv.get("child"):
                    child_name = f"{inv['child'].get('firstName', '')} {inv['child'].get('lastName', '')}"
                amount = f"${inv.get('total', 0):.2f}"
                due = inv.get("dueDate", "")
                if due:
                    try:
                        due = datetime.datetime.fromisoformat(due.replace("Z", "+00:00")).strftime("%b %d, %Y")
                    except Exception:
                        pass
                st.write(f"- {emoji} **{inv.get('status', 'N/A')}** — {amount} {f'for {child_name}' if child_name else ''} (Due: {due})")
        elif invoices is not None:
            st.info("No invoices found.")

# ─── Footer ──────────────────────────────────────────────────────────────

st.markdown("---")
st.caption("🧸 KidsManage Streamlit Dashboard — Companion interface to the main React application.")
