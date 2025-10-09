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
  for (let h = 4; h <= 23; h++) {              // from 04:00 to 23:45
    for (let m = 0; m < 60; m += 15) {
      const hh = String(h).padStart(2, '0')
      const mm = String(m).padStart(2, '0')
      times.push(`${hh}:${mm}`)
    }
  }
  for (let t of times) {
    startSel.innerHTML += `<option value="${t}">${t}</option>`
    endSel.innerHTML   += `<option value="${t}">${t}</option>`
  }
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

  listClasses() {
    return this.enrolledClasses
      .map(c => `${c.code} on ${c.day} from ${c.startTime} to ${c.endTime}`)
      .join('\n')
  }
}

// Instantiate a student (you can prompt for name/id later)
const student = new Student('Alice', 'S001')

// References to DOM elements
const form      = document.getElementById('add-form')
const listDiv   = document.getElementById('list')
const summaryDiv= document.getElementById('summary')
const listBtn   = document.getElementById('list-btn')
const resetBtn  = document.getElementById('reset-btn')

let editIndex = null

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

const submitBtn = form.querySelector('button[type="submit"]')

const filterDaySelect = document.getElementById('filter-day')

// after you define form, submitBtn, editIndex…
function attachEntryHandlers() {
  // EDIT buttons
  document.querySelectorAll('.edit-btn').forEach(btn =>
    btn.addEventListener('click', onEditClick)
  )

  // CANCEL buttons (only on the editing row)
  document.querySelectorAll('.cancel-btn').forEach(btn =>
    btn.addEventListener('click', onCancelClick)
  )

  // DELETE buttons
  document.querySelectorAll('.delete-btn').forEach(btn =>
    btn.addEventListener('click', e => {
      const idx = +e.currentTarget.dataset.index
      student.removeClass(idx)
      applyFilter()
    })
  )
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

  // 1) Sort by day index, then by start time
  const sorted = [...list].sort((a, b) => {
    const dayA = WEEKDAYS.indexOf(a.day)
    const dayB = WEEKDAYS.indexOf(b.day)
    if (dayA !== dayB) return dayA - dayB
    return toMinutes(a.startTime) - toMinutes(b.startTime)
  })

  // 2) Group classes by day
  const groups = WEEKDAYS
    .map(day => ({
      day,
      entries: sorted.filter(c => c.day === day)
    }))
    .filter(group => group.entries.length > 0)

  // 3) Build HTML with headings per group
  listDiv.innerHTML = groups
    .map(group => {
      const items = group.entries
        .map(c => {
          const idx = student.enrolledClasses.indexOf(c)
          return `
            <div class="class-entry${idx === editIndex ? ' editing' : ''}">
              <span>${c.code} – ${c.startTime}–${c.endTime}</span>
              ${idx === editIndex
                ? `<button class="cancel-btn" data-index="${idx}">Cancel</button>`
                : `<button class="edit-btn"   data-index="${idx}">Edit</button>`
              }
              <button class="delete-btn" data-index="${idx}">Delete</button>
            </div>
          `
        })
        .join('')

      return `
        <div class="day-group">
          <h3>${group.day}</h3>
          ${items}
        </div>
      `
    })
    .join('')

  // 4) Reattach event handlers
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

// Event: Show List via Button
listBtn.addEventListener('click', () => {
  alert(student.listClasses())
})

// Event: Reset Everything
resetBtn.addEventListener('click', () => {
  student.enrolledClasses = []
  applyFilter()      // this will call renderList([]) + renderSummary([])
})

// Initial render on page load
populateTimeSelects()
applyFilter()