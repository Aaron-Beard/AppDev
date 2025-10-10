// js/main.js

const WEEKDAYS = [
  'Monday', 'Tuesday', 'Wednesday',
  'Thursday', 'Friday', 'Saturday', 'Sunday'
]

// Populate time select elements with 15-min intervals
function populateTimeSelects() {
  const startSel = document.getElementById('startTime')
  const endSel   = document.getElementById('endTime')
  const times = []
  for (let h = 3; h <= 23; h++) {              // from 03:00 to 23:45
    for (let m = 0; m < 60; m += 15) {
      const hh = String(h).padStart(2, '0')
      const mm = String(m).padStart(2, '0')
      times.push(`${hh}:${mm}`)
    }
  }
  for (let t of times) {
    const label = formatTime(t)
    startSel.innerHTML += `<option value="${t}">${label}</option>`
    endSel.innerHTML   += `<option value="${t}">${label}</option>`
  }
}

// Convert "HH:MM" → "h:MM AM/PM"
function formatTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const suffix = h < 12 ? 'AM' : 'PM'
  const hour12 = ((h + 11) % 12) + 1  // maps 0→12, 13→1, etc.
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`
}

// Convert "HH:MM" → minutes
function toMinutes(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

class ClassEntry {
  constructor(code, day, startTime, endTime) {
    this.code      = code
    this.day       = day
    this.startTime = startTime
    this.endTime   = endTime
  }
}

class Student {
  constructor(name, id) {
    this.name            = name
    this.id              = id
    this.enrolledClasses = []
  }

  addClass(newClass) {
    // 1. Ensure endTime > startTime
    if (toMinutes(newClass.endTime) <= toMinutes(newClass.startTime)) {
      return `End time must be after start time for ${newClass.code}.`
    }

    // 2. Time-conflict check
    for (let c of this.enrolledClasses) {
      const overlap =
      c.day === newClass.day &&
      toMinutes(c.startTime) < toMinutes(newClass.endTime) &&
      toMinutes(newClass.startTime) < toMinutes(c.endTime) 

    if (overlap) { 
      return `Time conflict with ${c.code} on ${c.day}.`
    }
  }
    this.enrolledClasses.push(newClass)
    return null  // success
  }

  removeClass(index) {
    this.enrolledClasses.splice(index, 1)
  }


  updateClass(index, newClass) {
    // returns null on success, or an error message string on failure
    const old = this.enrolledClasses.splice(index, 1)[0]
    const err = this.addClass(newClass)
    if (err) {
      this.enrolledClasses.splice(index, 0, old)
    return err
    }
    return null
  }

  listClasses() {
    if (!this.enrolledClasses.length) {
      return `${this.name} (${this.id}) has no classes.`
    }
    const parts = this.enrolledClasses.map(c =>
      `${c.code} on ${c.day} ${formatTime(c.startTime)}–${formatTime(c.endTime)}`
    )
    return `${this.name} (${this.id}) is enrolled in: ${parts.join('; ')}.`
  }
}




// ——— Multi-student support ———
const students = [ new Student('Timmy','001') ]
let currentStudentId = students[0].id

function getCurrentStudent() {
  return students.find(s => s.id === currentStudentId)
}


// References to DOM elements
const form      = document.getElementById('add-form')
const listDiv   = document.getElementById('list')
const summaryDiv= document.getElementById('summary')
const resetBtn  = document.getElementById('reset-btn')
const sortCodeBtn = document.getElementById('sort-code-btn')
const sortDayBtn  = document.getElementById('sort-day-btn')
const submitBtn = form.querySelector('button[type=submit]')
const filterDaySelect = document.getElementById('filter-day')
const studentSelect   = document.getElementById('student-select')
const addStudentBtn   = document.getElementById('add-student-btn')
const studentNameInput = document.getElementById('student-name-input')
const studentIdInput   = document.getElementById('student-id-input')
const studentErrorDiv  = document.getElementById('student-error')
const deleteStudentBtn      = document.getElementById('delete-student-btn')
const searchInput = document.getElementById('search-input')

let sortConfig = {
  field: null,   // 'code' or 'day'
  asc:   true
}

let editIndex = null
let   deleteStudentConfirm  = false
let   deleteStudentTimerId

searchInput.addEventListener('input', applyFilter)

// Populate the dropdown
function refreshStudentDropdown() {
  studentSelect.innerHTML = students
    .map(s => `<option value="${s.id}">${s.name} (${s.id})</option>`)
    .join('')
  studentSelect.value = currentStudentId
}
refreshStudentDropdown()

// Switch active student
studentSelect.addEventListener('change', () => {
  currentStudentId = studentSelect.value
  applyFilter()
})

// Add a new student
addStudentBtn.addEventListener('click', () => {
  // clear any previous student‐add errors
  studentErrorDiv.innerText = ''

  const name = studentNameInput.value.trim()
  const id   = studentIdInput.value.trim()

  // Validate and show inline error
  if (!name || !id || students.some(s => s.id === id)) {
    studentErrorDiv.innerText = 'Invalid or duplicate student name/ID'
    return
  }

  const s = new Student(name, id)
  students.push(s)
  currentStudentId = id
  refreshStudentDropdown()
  applyFilter()

  // clear the inputs on success
  studentNameInput.value = ''
  studentIdInput.value   = ''
})

 deleteStudentBtn.addEventListener('click', () => {
   if (!deleteStudentConfirm) {
     deleteStudentConfirm = true
     deleteStudentBtn.textContent = 'Confirm Delete'
     deleteStudentBtn.classList.add('confirming')

     deleteStudentTimerId = setTimeout(() => {
       deleteStudentConfirm = false
       deleteStudentBtn.textContent = 'Delete Student'
       deleteStudentBtn.classList.remove('confirming')
     }, 5000)

   } else {
     clearTimeout(deleteStudentTimerId)

     // 1) Remove from array
     const idx = students.findIndex(s => s.id === currentStudentId)
     if (idx > -1) students.splice(idx, 1)

    // 2) Reset the delete‐button back to normal immediately
    deleteStudentConfirm = false
    deleteStudentBtn.textContent = 'Delete Student'
    deleteStudentBtn.classList.remove('confirming')

     // 3) Pick new currentStudentId (first student or null)
     if (students.length) {
       currentStudentId = students[0].id
     } else {
       currentStudentId = null
     }

     // 4) Refresh UI
     refreshStudentDropdown()
     applyFilter()
   }
 })

// Remove any existing highlight
function clearHighlight() {
  document.querySelectorAll('.class-entry.editing').forEach(el =>
    el.classList.remove('editing')
  );
}

// Highlight the entry matching a given index
function highlightEntryByIndex(idx) {
  clearHighlight();
  const btn = document.querySelector(`.edit-btn[data-index="${idx}"]`);
  if (!btn) return;
  const entryDiv = btn.closest('.class-entry');
  if (entryDiv) entryDiv.classList.add('editing');
}

// after you define form, submitBtn, editIndex…
function attachEntryHandlers() {
  // EDIT
  document.querySelectorAll('.edit-btn').forEach(btn =>
    btn.addEventListener('click', onEditClick)
  )

  // CANCEL
  document.querySelectorAll('.cancel-btn').forEach(btn =>
    btn.addEventListener('click', onCancelClick)
  )

  // DELETE w/ two-step confirmation
  document.querySelectorAll('.delete-btn').forEach(btn => {
    let deleteTimerId

    btn.addEventListener('click', e => {
      // 1st click → flip into “Confirm Delete” mode
      if (!btn.classList.contains('confirming')) {
        btn.classList.add('confirming')
        btn.textContent = 'Confirm Delete'

        // auto-revert after 5s
        deleteTimerId = setTimeout(() => {
          btn.classList.remove('confirming')
          btn.textContent = 'Delete'
        }, 5000)

      } else {
        // 2nd click → actually delete
        clearTimeout(deleteTimerId)

        const idx = Number(e.currentTarget.dataset.index)
        getCurrentStudent().removeClass(idx)
        applyFilter()
      }
    })
  })
}

sortCodeBtn.addEventListener('click', () => {
  sortConfig.field = 'code'
  sortConfig.asc   = !sortConfig.asc
  sortCodeBtn.textContent =
    `Sort by Class Code ${sortConfig.asc ? '▲' : '▼'}`
  // reset the other toggle arrow
  sortDayBtn.textContent = 'Sort by Day ▲'
  applyFilter()
})

sortDayBtn.addEventListener('click', () => {
  sortConfig.field = 'day'
  sortConfig.asc   = true    // <-- lowercase `true`
  sortDayBtn.textContent = 'Sort by Day ▲'
  sortCodeBtn.textContent = 'Sort by Class Code ▲'
  applyFilter()
})

function startEditSession(idx) {
  editIndex = idx
  const cls = getCurrentStudent().enrolledClasses[idx]

  // Prefill form fields
  document.getElementById('code').value      = cls.code
  document.getElementById('startTime').value = cls.startTime
  document.getElementById('endTime').value   = cls.endTime

  // Check only the correct day checkbox
  document
    .querySelectorAll('#day-group input[type=checkbox]')
    .forEach(cb => {
      cb.checked = (cb.value === cls.day)
    })

  // Switch submit button label
  submitBtn.textContent = 'Save Changes'

  // Highlight the editing row
  applyFilter()

  // Remove the selector UI, if still present
  document.getElementById('edit-select-container').innerHTML = ''
}

function onEditClick(e) {
  clearErrors()
  editIndex = Number(e.currentTarget.dataset.index)
  highlightEntryByIndex(editIndex)

  const entry = getCurrentStudent().enrolledClasses[editIndex]
  document.getElementById('code').value = entry.code
  document.querySelectorAll('#day-group input').forEach(ch =>
    ch.checked = ch.value === entry.day
  )
  document.getElementById('startTime').value = entry.startTime
  document.getElementById('endTime').value   = entry.endTime

  submitBtn.textContent = 'Update Class'
  applyFilter()  // to show Cancel button
}

function onCancelClick(e) {
  editIndex = null
  clearErrors()
  clearHighlight()

  submitBtn.textContent = 'Add Class'
  form.reset()

  // Re-render so that Cancel button disappears
  applyFilter()
}

// Render functions
function renderList(list = getCurrentStudent().enrolledClasses) {
  if (!list.length) {
    listDiv.innerText = 'No classes enrolled.'
    return
  }

  const isCodeSort = sortConfig.field === 'code'
  let sorted, groups

  if (isCodeSort) {
    // 1) Sort by code → day → startTime
    sorted = [...list].sort((a, b) => {
      const cmp = a.code.localeCompare(b.code)
      if (cmp !== 0) return sortConfig.asc ? cmp : -cmp

      const dA = WEEKDAYS.indexOf(a.day)
      const dB = WEEKDAYS.indexOf(b.day)
      if (dA !== dB) return dA - dB

      return toMinutes(a.startTime) - toMinutes(b.startTime)
    })

    // 2) Group by code
    const codes = [...new Set(sorted.map(c => c.code))]
    groups = codes.map(code => ({
      label: code,
      entries: sorted.filter(c => c.code === code)
    }))
  } else {
    // 1) Sort by day → startTime
    sorted = [...list].sort((a, b) => {
      const dA = WEEKDAYS.indexOf(a.day)
      const dB = WEEKDAYS.indexOf(b.day)
      if (dA !== dB) return dA - dB
      return toMinutes(a.startTime) - toMinutes(b.startTime)
    })

    // 2) Group by day
    groups = WEEKDAYS
      .map(day => ({
        label: day,
        entries: sorted.filter(c => c.day === day)
      }))
      .filter(g => g.entries.length)
  }

  // 3) Render each group
  listDiv.innerHTML = groups
    .map(group => {
      const items = group.entries
        .map(c => {
          const idx       = getCurrentStudent().enrolledClasses.indexOf(c)
          const isEditing = idx === editIndex

          // Choose what to display before the time
          const entryLabel = isCodeSort
            ? c.day
            : c.code

          return `
            <div class="class-entry${isEditing ? ' editing' : ''}">
              <span>
                ${entryLabel} – ${formatTime(c.startTime)}–${formatTime(c.endTime)}
              </span>
              ${isEditing
                ? `<button class="cancel-btn" data-index="${idx}">Cancel</button>`
                : `<button class="edit-btn"   data-index="${idx}">Edit</button>`
              }
              <button class="delete-btn" data-index="${idx}">Delete</button>
            </div>
          `
        })
        .join('')

      return `
        <div class="${isCodeSort ? 'code-group' : 'day-group'}">
          <h3>${group.label}</h3>
          ${items}
        </div>
      `
    })
    .join('')

  attachEntryHandlers()
}

function renderSummary(list = getCurrentStudent().enrolledClasses) {
  const student = getCurrentStudent();
  const nameId  = `${student.name} (${student.id})`;

  if (list.length === 0) {
    summaryDiv.innerText = `${nameId} has no classes.`;
    return;
  }

  // 1) Count of classes
  const count = list.length;

  // 2) Sum total minutes
  const totalMinutes = list.reduce(
    (sum, c) => sum + (toMinutes(c.endTime) - toMinutes(c.startTime)),
    0
  );

  // 3) Convert to decimal hours, rounded to two decimals
  const totalHours = totalMinutes / 60;
  const hoursDecimal = Math.round(totalHours * 100) / 100;

  // 4) Render
  summaryDiv.innerText =
    `${nameId} has ${count} ${count === 1 ? 'class' : 'classes'} ` +
    `totaling ${hoursDecimal} hour${hoursDecimal === 1 ? '' : 's'}.`;
}


function applyFilter() {
  const day    = filterDaySelect.value
  const term   = searchInput.value.trim().toUpperCase()
  let   list   = getCurrentStudent().enrolledClasses

  // Filter by day
  if (day !== 'All') {
    list = list.filter(c => c.day === day)
  }

  // Live‐search filter on class code
  if (term) {
    list = list.filter(c =>
      c.code.toUpperCase().includes(term)
    )
  }

  renderList(list)
  renderSummary(list)
}

filterDaySelect.addEventListener('change', applyFilter)

// Clear all previous errors and invalid markers
function clearErrors() {
  document.getElementById('error-container').innerHTML = ''
  // remove .invalid from any element
  document.querySelectorAll('.invalid').forEach(el =>
    el.classList.remove('invalid')
  )
}

// Display a list of error messages
function showErrors(errors) {
  const container = document.getElementById('error-container')
  container.innerHTML = errors
    .map(msg => `<div>${msg}</div>`)
    .join('')
}

// Return an array of validation messages
function validateForm() {
  const errors = []
  const code = document.getElementById('code').value.trim()
  const days = Array.from(
    document.querySelectorAll('#day-group input[type=checkbox]')
  )
  .filter(ch => ch.checked)
  .map(ch => ch.value)
  const start = document.getElementById('startTime').value
  const end   = document.getElementById('endTime').value

  if (!code) {
    errors.push('Class code is required.')
    document.getElementById('code').classList.add('invalid')
  }

  if (days.length === 0) {
    errors.push('Select at least one day.')
    document.getElementById('day-group').classList.add('invalid')
  }

  if (!start || !end) {
    errors.push('Both start time and end time are required.')
    if (!start) document.getElementById('startTime').classList.add('invalid')
    if (!end)   document.getElementById('endTime').classList.add('invalid')
  } else if (toMinutes(end) <= toMinutes(start)) {
    errors.push('End time must be after start time.')
    document.getElementById('startTime').classList.add('invalid')
    document.getElementById('endTime').classList.add('invalid')
  }

  return { errors, code, days, start, end }
}

// Event: Form Submission
form.addEventListener('submit', e => {
  e.preventDefault()
  clearErrors()

  const { errors, code, days, start, end } = validateForm()
  if (errors.length) {
    showErrors(errors)
    return
  }

  if (editIndex !== null) {
  // 1) Remove the original entry
  const oldEntry = getCurrentStudent().enrolledClasses.splice(editIndex, 1)[0]
  const addedEntries = []
  let allAdded = true
  // 2) Try to add one new entry per selected day
  for (let d of days) {
    const candidate = new ClassEntry(code, d, start, end)
    const err = getCurrentStudent().addClass(candidate)
    if (err) {
      allAdded = false
      // 3a) Rollback any that got added
      addedEntries.forEach(ent => {
        const idx = getCurrentStudent().enrolledClasses.indexOf(ent)
        if (idx > -1) {
          getCurrentStudent().enrolledClasses.splice(idx, 1)
        }
      })
      break
    }
    addedEntries.push(candidate)
  }

  if (!allAdded) {
    // 3b) Restore original at its old position
    getCurrentStudent().enrolledClasses.splice(editIndex, 0, oldEntry)
    showErrors(['Time conflict or invalid time.'])
    return
  }

  // 4) Success: clear edit state
  editIndex = null

  } else {
  // Add-mode: push one entry per day (unchanged)
  for (let d of days) {
    const entry = new ClassEntry(code, d, start, end)
    const err = getCurrentStudent().addClass(entry)
    if (err) {
      showErrors([err])
      return
    }
  }
}

  // Re-render + reset form + reset button text
  applyFilter()
  form.reset()
  submitBtn.textContent = 'Add Class'
})

;['code','startTime','endTime'].forEach(id =>
  document.getElementById(id).addEventListener('input', clearErrors)
)
document.querySelectorAll('#day-group input').forEach(ch =>
  ch.addEventListener('change', clearErrors)
)

let resetConfirming = false
let resetTimerId

resetBtn.addEventListener('click', () => {
  if (!resetConfirming) {
    // 1st click: flip into “confirm” mode
    resetConfirming = true
    resetBtn.textContent = 'Confirm Reset'
    resetBtn.classList.add('confirming')

    // auto‐revert after 5s if unused
    resetTimerId = setTimeout(() => {
      resetConfirming = false
      resetBtn.textContent = 'Reset List'
      resetBtn.classList.remove('confirming')
    }, 5000)

  } else {
    // 2nd click: user confirmed
    clearTimeout(resetTimerId)
    getCurrentStudent().enrolledClasses = []
    applyFilter()

    // restore button to normal
    resetConfirming = false
    resetBtn.textContent = 'Reset List'
    resetBtn.classList.remove('confirming')
  }
})

// Initial render on page load
populateTimeSelects()
applyFilter()