// js/main.js

function populateTimeSelects() {
  const startSel = document.getElementById('startTime')
  const endSel   = document.getElementById('endTime')
  const times = []
  for (let h = 4; h <= 23; h++) {              // from 07:00 to 22:45
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
      return
    }

    // 2. Time-conflict check
    for (let c of this.enrolledClasses) {
      if (
        c.day === newClass.day &&
        toMinutes(newClass.startTime) < toMinutes(c.endTime) &&
        toMinutes(c.startTime)   < toMinutes(newClass.endTime)
      ) {
        alert(`Time conflict with ${c.code} on ${c.day}`)
        return
      }
    }

    // 3. If all good, add the class
    this.enrolledClasses.push(newClass)
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

const filterDaySelect = document.getElementById('filter-day')

// Render functions
function renderList(list = student.enrolledClasses) {

  if (list.length === 0) {
    listDiv.innerText = 'No classes enrolled.'
    return
  }

  listDiv.innerHTML = list
    .map(c => {
      const globalIdx = student.enrolledClasses.indexOf(c)
      return`
        <div class="class-entry">
         <span>${c.code} - ${c.day} (${c.startTime}-${c.endTime})</span>
         <button class="delete-btn" data-index="${globalIdx}">Delete</button>
        </div>
       `
    })
    .join('')

  document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = Number(e.currentTarget.dataset.index)
        student.removeClass(idx)
        applyFilter()
      })
    })
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

// Event: Add Class
form.addEventListener('submit', e => {
  e.preventDefault()
  clearErrors()

  // 1) Run validations
  const { errors, code, days, start, end } = validateForm()
  if (errors.length) {
    showErrors(errors)
    return
  }

  // 2) Add entries for each day
  days.forEach(day => {
    const entry = new ClassEntry(code, day, start, end)
    student.addClass(entry)
  })

  // 3) Re-render and reset
  applyFilter()
  form.reset()
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