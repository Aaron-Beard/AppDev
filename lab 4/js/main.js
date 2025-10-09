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
      alert(`Invalid time: ${newClass.code} must end after it starts.`)
      return false
    }

    // 2. Time-conflict check
    for (let c of this.enrolledClasses) {
      if (
        c.day === newClass.day &&
        toMinutes(newClass.startTime) < toMinutes(c.endTime) &&
        toMinutes(c.startTime)   < toMinutes(newClass.endTime)
      ) {
        alert(`Time conflict with ${c.code} on ${c.day}`)
        return false
      }
    }

    // 3. If all good, add the class
    this.enrolledClasses.push(newClass)
    return true
  }

  removeClass(index) {
    this.enrolledClasses.splice(index, 1)
  }
}

// Instantiate a student (you can prompt for name/id later)
const student = new Student('Alice', 'S001')

// References to DOM elements
const form      = document.getElementById('add-form')
const listDiv   = document.getElementById('list')
const summaryDiv= document.getElementById('summary')
const resetBtn  = document.getElementById('reset-btn')
const sortCodeBtn = document.getElementById('sort-code-btn')
const sortDayBtn  = document.getElementById('sort-day-btn')
const updateCodeInput = document.getElementById('update-code-input')
const updateCodeBtn   = document.getElementById('update-code-btn')
const submitBtn = form.querySelector('button[type=submit]')
const filterDaySelect = document.getElementById('filter-day')
const updateError = document.getElementById('update-error')

let sortConfig = {
  field: null,   // 'code' or 'day'
  asc:   true
}

let editIndex = null

function clearUpdateError() {
  updateError.textContent = ''
}

updateCodeInput.addEventListener('input', clearUpdateError)


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
        student.removeClass(idx)
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

updateCodeBtn.addEventListener('click', () => {
  clearUpdateError()
  console.log('🖱 Find & Edit clicked – raw input:', updateCodeInput.value)

  // now define and log codeToFind
  const codeToFind = updateCodeInput.value.trim().toUpperCase()
  console.log('   → normalized codeToFind =', codeToFind)

  if (!codeToFind) {
    updateError.textContent = 'Please enter a class code to update.'
    return
  }

  const matches = student.enrolledClasses
    .map((entry, idx) => ({ entry, idx }))
    .filter(({ entry }) => entry.code.toUpperCase().startsWith(codeToFind)
    )
  console.log('   → matches.length =', matches.length)

  if (matches.length === 0) {
    updateError.textContent = `No class found with code “${codeToFind}”.`
    return
  }

  if (matches.length === 1) {
    console.log('   → single match, idx =', matches[0].idx)
    startEditSession(matches[0].idx)
    return
  }

  console.log('   → multiple matches, rendering selector')
  renderSessionSelector(matches)
})

function startEditSession(idx) {
  editIndex = idx
  const cls = student.enrolledClasses[idx]

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

function renderSessionSelector(matches) {
  const container = document.getElementById('edit-select-container')
  container.innerHTML = ''  // clear any old content

  // Label above the dropdown
  const label = document.createElement('label')
  label.textContent = 'Select session to edit:'
  container.appendChild(label)

  // The <select> element
  const select = document.createElement('select')
  select.id = 'session-select'
  container.appendChild(select)

  // Populate options
  matches.forEach(({ entry, idx }) => {
    const opt = document.createElement('option')
    opt.value = idx
    opt.textContent = 
      `${entry.code} - ${entry.day} - ${formatTime(entry.startTime)}-${formatTime(entry.endTime)}`
    select.appendChild(opt)
  })

  // When the user picks one, immediately start editing it
  select.addEventListener('change', e => {
    const chosenIdx = Number(e.target.value)
    startEditSession(chosenIdx)
  })

  // Optionally auto-open the dropdown
  select.focus()
}

function onEditClick(e) {
  clearErrors()
  editIndex = Number(e.currentTarget.dataset.index)
  highlightEntryByIndex(editIndex)

  const entry = student.enrolledClasses[editIndex]
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
function renderList(list = student.enrolledClasses) {
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
          const idx       = student.enrolledClasses.indexOf(c)
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

function renderSummary(list = student.enrolledClasses) {
  const count = list.length
  // sum all durations in minutes
  const totalMinutes = list.reduce(
    (sum, c) => sum + (toMinutes(c.endTime) - toMinutes(c.startTime)),
    0
  )

  // convert to decimal hours
  const totalHours = totalMinutes / 60

  // trim to 2 decimal places
  const displayHours = Number.isInteger(totalHours)
  ? totalHours
  : totalHours.toFixed(2)

  summaryDiv.innerText = 
    `Total classes: ${count}` + '\n' +
    `Total hours: ${displayHours} hours`
}

function applyFilter() {
   const day = filterDaySelect.value
   const filtered = (day === 'All')
     ? student.enrolledClasses
     : student.enrolledClasses.filter(c => c.day === day)

   renderList(filtered)   
   renderSummary(filtered)
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
    // 1) Remove the single old entry
    const oldEntry = student.enrolledClasses.splice(editIndex, 1)[0]

    // 2) Try to add one entry per selected day
    const addedEntries = []
    let allAdded = true

    for (let day of days) {
      const candidate = new ClassEntry(code, day, start, end)
      if (student.addClass(candidate)) {
        addedEntries.push(candidate)
      } else {
        allAdded = false
        break
      }
    }

    if (!allAdded) {
      // 3a) Roll back any that did get added
      addedEntries.forEach(ent => {
        const idx = student.enrolledClasses.indexOf(ent)
        if (idx > -1) student.enrolledClasses.splice(idx, 1)
      })
      // 3b) Restore the original at its old position
      student.enrolledClasses.splice(editIndex, 0, oldEntry)
      // leave editIndex as-is so user can tweak again
    } else {
      // 4) Success: clear edit state
      editIndex = null
    }

  } else {
    // Normal “Add” flow for new multi-day entries
    days.forEach(day => {
      const entry = new ClassEntry(code, day, start, end)
      student.addClass(entry)
    })
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
    student.enrolledClasses = []
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