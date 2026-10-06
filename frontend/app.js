const LOGIN_API = "https://womp1loginapi.onrender.com"
const BOARD_API = "https://virtualboardapi.onrender.com"

const loginView = document.getElementById("loginView")
const boardView = document.getElementById("boardView")

const usernameInput = document.getElementById("username")
const passwordInput = document.getElementById("password")

const loginBtn = document.getElementById("loginBtn")
const logoutBtn = document.getElementById("logoutBtn")
const addNoteBtn = document.getElementById("addNoteBtn")

addNoteBtn.addEventListener("click", createNote)

const loginMessage = document.getElementById("loginMessage")
const board = document.getElementById("board")

const BOARD_ID = 1
let isDraggingNote = false
let pendingNoteUpdates = 0
let notesRevision = 0

loginBtn.addEventListener("click", login)
logoutBtn.addEventListener("click", logout)

async function login() {
  const username = usernameInput.value
  const password = passwordInput.value

  try {
    const response = await fetch(`${LOGIN_API}/users/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username,
        password
      })
    })

    const data = await response.json()

    if (!response.ok) {
      loginMessage.textContent = "Login failed"
      return
    }

    localStorage.setItem("jwt", data.jwt)

    loginView.classList.add("hidden")
    boardView.classList.remove("hidden")

    loadNotes()

  } catch (error) {
    loginMessage.textContent = "Could not connect to login API"
    console.error(error)
  }
}

function isBoardBusy() {
  return isDraggingNote || pendingNoteUpdates > 0 || board.querySelector("textarea:focus, select:focus")
}

async function loadNotes() {
  if (isBoardBusy()) return
  const revision = notesRevision
  const token = localStorage.getItem("jwt")

  try {
    const response = await fetch(
      `${BOARD_API}/notes?boardId=${BOARD_ID}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    const notes = await response.json()

    if (!response.ok) {
      console.error(notes)
      return
    }

    // Ignore responses from before an edit, drag, or logout.
    if (!isBoardBusy() && revision === notesRevision && token === localStorage.getItem("jwt")) {
      renderNotes(notes)
    }

  } catch (error) {
    console.error("Could not load notes:", error)
  }
}

function renderNotes(notes) {
  board.innerHTML = ""

  notes.forEach(note => {
    const noteElement = document.createElement("div")

    noteElement.classList.add("note")
    noteElement.style.backgroundColor = note.color
    noteElement.style.left = `${note.positionX}px`
    noteElement.style.top = `${note.positionY}px`

    noteElement.innerHTML = `
    <textarea></textarea>

    <div class="note-actions">
        <select aria-label="Note color">
          <option value="" disabled hidden>Color</option>
          <option value="#fff59d">Yellow</option>
          <option value="#f8bbd0">Pink</option>
          <option value="#bbdefb">Blue</option>
          <option value="#c8e6c9">Green</option>
        </select>
        <button>Delete</button>
    </div>
    `

    const textarea = noteElement.querySelector("textarea")
    textarea.value = note.text
    const colorPicker = noteElement.querySelector("select")
    const deleteBtn = noteElement.querySelector("button")
    colorPicker.value = (note.color || "").toLowerCase()
    if (colorPicker.selectedIndex < 0) colorPicker.selectedIndex = 0

    colorPicker.addEventListener("change", () => {
      noteElement.style.backgroundColor = colorPicker.value
      updateNote(note.id, { color: colorPicker.value })
    })

    textarea.addEventListener("change", () => {
      updateNote(note.id, {
        text: textarea.value
      })
    })

    deleteBtn.addEventListener("click", () => {
      deleteNote(note.id)
    })

    makeDraggable(noteElement, note)

    board.appendChild(noteElement)
  })
}

async function createNote() {
  const token = localStorage.getItem("jwt")

  const response = await fetch(`${BOARD_API}/notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      text: "New note",
      color: "#fff59d",
      positionX: 100,
      positionY: 100,
      boardId: BOARD_ID
    })
  })

  if (response.ok) {
    loadNotes()
  }
}

async function updateNote(id, data) {
  const token = localStorage.getItem("jwt")
  pendingNoteUpdates++
  notesRevision++

  try {
    await fetch(`${BOARD_API}/notes/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data)
    })
  } finally {
    pendingNoteUpdates--
    notesRevision++
  }
}

async function deleteNote(id) {
  const token = localStorage.getItem("jwt")

  const response = await fetch(`${BOARD_API}/notes/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  if (response.ok) {
    loadNotes()
  }
}

function makeDraggable(element, note) {
  let isDragging = false
  let offsetX = 0
  let offsetY = 0

  element.addEventListener("mousedown", (event) => {
    if (
      event.button !== 0 ||
      event.target.tagName === "TEXTAREA" ||
      event.target.tagName === "BUTTON" ||
      event.target.tagName === "SELECT"
    ) {
      return
    }

    isDragging = true
    isDraggingNote = true
    notesRevision++
    document.addEventListener("mousemove", moveNote)
    document.addEventListener("mouseup", stopDragging)

    const rect = element.getBoundingClientRect()

    offsetX = event.clientX - rect.left
    offsetY = event.clientY - rect.top

    element.style.cursor = "grabbing"
  })

  function moveNote(event) {
    if (!isDragging) {
      return
    }

    const boardRect = board.getBoundingClientRect()

    let x = event.clientX - boardRect.left - offsetX
    let y = event.clientY - boardRect.top - offsetY

    if (x < 0) {
      x = 0
    }

    if (y < 0) {
      y = 0
    }

    element.style.left = `${x}px`
    element.style.top = `${y}px`
  }

  async function stopDragging() {
    if (!isDragging) {
      return
    }

    isDragging = false
    isDraggingNote = false
    document.removeEventListener("mousemove", moveNote)
    document.removeEventListener("mouseup", stopDragging)
    element.style.cursor = "grab"

    const positionX = parseInt(element.style.left)
    const positionY = parseInt(element.style.top)

    await updateNote(note.id, {
      positionX,
      positionY
    })
  }
}

function logout() {
  localStorage.removeItem("jwt")

  boardView.classList.add("hidden")
  loginView.classList.remove("hidden")
}

function checkLogin() {
  const token = localStorage.getItem("jwt")

  if (token) {
    loginView.classList.add("hidden")
    boardView.classList.remove("hidden")
    loadNotes()
  } else {
    loginView.classList.remove("hidden")
    boardView.classList.add("hidden")
  }
}

setInterval(() => {
  const token = localStorage.getItem("jwt")

  if (token && !boardView.classList.contains("hidden")) {
    loadNotes()
  }
}, 5000)

checkLogin()
