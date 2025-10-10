// ===== CONSTANTS AND CONFIGURATION =====

// Array of all days for consistent ordering
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Color palette for class codes in table view
const PALETTE = [
  '#A6CEE3', '#1F78B4', '#B2DF8A', '#33A02C',
  '#FB9A99', '#E31A1C', '#FDBF6F', '#FF7F00',
  '#CAB2D6', '#6A3D9A', '#FFFF99', '#B15928'
];

// ===== DATA MANAGEMENT =====

// Track colors assigned to each class code
const codeToColor = {};
let nextColorIdx = 0;

// Represents a single class session
class ClassEntry {
  constructor(code, day, startTime, endTime) {
    this.code = code;
    this.day = day;
    this.startTime = startTime;
    this.endTime = endTime;
  }
}

// Represents a student with their enrolled classes
class Student {
  constructor(name, id) {
    this.name = name;
    this.id = id;
    this.enrolledClasses = [];
  }

  // Add a class with validation for time conflicts
  addClass(newClass) {
    // Validate end time is after start time
    if (toMinutes(newClass.endTime) <= toMinutes(newClass.startTime)) {
      return `End time must be after start time for ${newClass.code}.`;
    }

    // Check for time conflicts with existing classes
    for (let existingClass of this.enrolledClasses) {
      const hasConflict = 
        existingClass.day === newClass.day &&
        toMinutes(existingClass.startTime) < toMinutes(newClass.endTime) &&
        toMinutes(newClass.startTime) < toMinutes(existingClass.endTime);

      if (hasConflict) {
        return `Time conflict with ${existingClass.code} on ${existingClass.day}.`;
      }
    }

    this.enrolledClasses.push(newClass);
    return null; // Success - no error
  }

  // Remove class by index
  removeClass(index) {
    this.enrolledClasses.splice(index, 1);
  }

  // Update existing class with validation
  updateClass(index, updatedClass) {
    const originalClass = this.enrolledClasses.splice(index, 1)[0];
    const error = this.addClass(updatedClass);
    
    if (error) {
      // Restore original class if update fails
      this.enrolledClasses.splice(index, 0, originalClass);
      return error;
    }
    
    return null; // Success
  }

  // Generate summary text of all classes
  listClasses() {
    if (!this.enrolledClasses.length) {
      return `${this.name} (${this.id}) has no classes.`;
    }
    
    const classDescriptions = this.enrolledClasses.map(c =>
      `${c.code} on ${c.day} ${formatTime(c.startTime)}–${formatTime(c.endTime)}`
    );
    
    return `${this.name} (${this.id}) is enrolled in: ${classDescriptions.join('; ')}.`;
  }
}

// ===== APPLICATION STATE =====

// Initialize with a default student
const students = [new Student('Timmy', '001')];
let currentStudentId = students[0].id;

// UI state management
let sortConfig = { field: null, asc: true };
let editIndex = null;
let deleteStudentConfirm = false;
let deleteStudentTimerId;
let isTableView = false;

// ===== DOM ELEMENT REFERENCES =====

const form = document.getElementById('add-form');
const listDiv = document.getElementById('list');
const summaryDiv = document.getElementById('summary');
const resetBtn = document.getElementById('reset-btn');
const sortCodeBtn = document.getElementById('sort-code-btn');
const sortDayBtn = document.getElementById('sort-day-btn');
const submitBtn = form.querySelector('button[type=submit]');
const filterDaySelect = document.getElementById('filter-day');
const studentSelect = document.getElementById('student-select');
const addStudentBtn = document.getElementById('add-student-btn');
const studentNameInput = document.getElementById('student-name-input');
const studentIdInput = document.getElementById('student-id-input');
const studentErrorDiv = document.getElementById('student-error');
const deleteStudentBtn = document.getElementById('delete-student-btn');
const searchInput = document.getElementById('search-input');
const toggleViewBtn = document.getElementById('toggle-view-btn');

// ===== UTILITY FUNCTIONS =====

// Assign consistent colors to class codes
function getColorForCode(code) {
  if (!codeToColor[code]) {
    codeToColor[code] = PALETTE[nextColorIdx % PALETTE.length];
    nextColorIdx++;
  }
  return codeToColor[code];
}

// Convert time string "HH:MM" to minutes since midnight
function toMinutes(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

// Format "HH:MM" as "h:MM AM/PM"
function formatTime(hhmm) {
  const [hour, minute] = hhmm.split(':').map(Number);
  const period = hour < 12 ? 'AM' : 'PM';
  const displayHour = ((hour + 11) % 12) + 1;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
}

// Get currently selected student
function getCurrentStudent() {
  return students.find(student => student.id === currentStudentId);
}

// Clear all error displays
function clearErrors() {
  document.getElementById('error-container').innerHTML = '';
  document.querySelectorAll('.invalid').forEach(element => {
    element.classList.remove('invalid');
  });
}

// ===== TIME SELECT POPULATION =====

// Fill time dropdowns with 15-minute intervals
function populateTimeSelects() {
  const startSelect = document.getElementById('startTime');
  const endSelect = document.getElementById('endTime');
  const timeOptions = [];

  // Generate times from 03:00 to 23:45
  for (let hour = 3; hour <= 23; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      timeOptions.push(timeString);
    }
  }

  // Add options to both dropdowns
  timeOptions.forEach(time => {
    const option = `<option value="${time}">${formatTime(time)}</option>`;
    startSelect.innerHTML += option;
    endSelect.innerHTML += option;
  });
}

// ===== RENDERING FUNCTIONS =====

// Render class list in grouped view
function renderList(classList = getCurrentStudent().enrolledClasses) {
  if (!classList.length) {
    listDiv.innerText = 'No classes enrolled.';
    return;
  }

  let sortedClasses, groupedClasses;

  if (sortConfig.field === 'code') {
    // Sort by code, then day, then time
    sortedClasses = [...classList].sort((a, b) => {
      const codeCompare = a.code.localeCompare(b.code);
      if (codeCompare !== 0) return sortConfig.asc ? codeCompare : -codeCompare;

      const dayA = WEEKDAYS.indexOf(a.day);
      const dayB = WEEKDAYS.indexOf(b.day);
      if (dayA !== dayB) return dayA - dayB;

      return toMinutes(a.startTime) - toMinutes(b.startTime);
    });

    // Group by class code
    const uniqueCodes = [...new Set(sortedClasses.map(c => c.code))];
    groupedClasses = uniqueCodes.map(code => ({
      label: code,
      entries: sortedClasses.filter(c => c.code === code)
    }));
  } else {
    // Sort by day, then time (always chronological)
    sortedClasses = [...classList].sort((a, b) => {
      const dayA = WEEKDAYS.indexOf(a.day);
      const dayB = WEEKDAYS.indexOf(b.day);
      if (dayA !== dayB) return dayA - dayB;
      return toMinutes(a.startTime) - toMinutes(b.startTime);
    });

    // Group by day
    groupedClasses = WEEKDAYS
      .map(day => ({
        label: day,
        entries: sortedClasses.filter(c => c.day === day)
      }))
      .filter(group => group.entries.length);
  }

  // Generate HTML for groups and entries
  listDiv.innerHTML = groupedClasses.map(group => {
    const isCodeGrouped = sortConfig.field === 'code';
    const entriesHtml = group.entries.map(classEntry => {
      const entryIndex = getCurrentStudent().enrolledClasses.indexOf(classEntry);
      const isBeingEdited = entryIndex === editIndex;
      
      const startsEarly = toMinutes(classEntry.startTime) < 9 * 60;
      const endsLate = toMinutes(classEntry.endTime) > 17 * 60;
      
      const displayLabel = isCodeGrouped ? classEntry.day : classEntry.code;

      return `
        <div class="class-entry${isBeingEdited ? ' editing' : ''} 
                      ${startsEarly ? ' before-nine' : ''} 
                      ${endsLate ? ' after-five' : ''}">
          <span>${displayLabel} - ${formatTime(classEntry.startTime)}-${formatTime(classEntry.endTime)}</span>
          ${isBeingEdited 
            ? `<button class="cancel-btn" data-index="${entryIndex}">Cancel</button>`
            : `<button class="edit-btn" data-index="${entryIndex}">Edit</button>`
          }
          <button class="delete-btn" data-index="${entryIndex}">Delete</button>
        </div>
      `;
    }).join('');

    return `
      <div class="${isCodeGrouped ? 'code-group' : 'day-group'}">
        <h3>${group.label}</h3>
        ${entriesHtml}
      </div>
    `;
  }).join('');

  attachEntryHandlers();
}

// Render schedule as timetable
function renderTable(classList) {
  if (!classList.length) {
    listDiv.innerHTML = '<div>No classes enrolled.</div>';
    return;
  }

  // Determine which days to show
  const daysToShow = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  if (classList.some(c => c.day === 'Saturday')) daysToShow.push('Saturday');
  if (classList.some(c => c.day === 'Sunday')) daysToShow.push('Sunday');

  // Calculate time range
  const startTimes = classList.map(c => toMinutes(c.startTime));
  const endTimes = classList.map(c => toMinutes(c.endTime));
  const earliestTime = Math.min(...startTimes);
  const latestTime = Math.max(...endTimes);

  // Generate 15-minute time slots
  const timeSlots = [];
  for (let time = earliestTime; time < latestTime; time += 15) {
    timeSlots.push(time);
  }

  // Reset color mapping for fresh render
  Object.keys(codeToColor).forEach(key => delete codeToColor[key]);
  nextColorIdx = 0;
  classList.forEach(c => getColorForCode(c.code));

  // Track row spans for multi-slot classes
  const skipCounters = {};
  daysToShow.forEach(day => { skipCounters[day] = 0; });

  // Build table rows
  const tableRows = timeSlots.map(slotTime => {
    const hours = Math.floor(slotTime / 60);
    const minutes = slotTime % 60;
    const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    
    // Only show time label on 30-minute boundaries
    const timeLabel = slotTime % 30 === 0 ? formatTime(timeString) : '';

    let rowHtml = `<tr><td class="time-cell">${timeLabel}</td>`;

    daysToShow.forEach(day => {
      if (skipCounters[day] > 0) {
        skipCounters[day]--;
        return;
      }

      const classAtSlot = classList.find(c => 
        c.day === day && toMinutes(c.startTime) === slotTime
      );

      if (classAtSlot) {
        const duration = toMinutes(classAtSlot.endTime) - toMinutes(classAtSlot.startTime);
        const rowSpan = duration / 15;
        skipCounters[day] = rowSpan - 1;

        const color = getColorForCode(classAtSlot.code);
        rowHtml += `
          <td rowspan="${rowSpan}" class="class-cell" style="background-color: ${color};">
            <strong>${classAtSlot.code}</strong><br>
            ${formatTime(classAtSlot.startTime)}–${formatTime(classAtSlot.endTime)}
          </td>`;
      } else {
        rowHtml += `<td></td>`;
      }
    });

    rowHtml += '</tr>';
    return rowHtml;
  }).join('');

  // Build complete table
  const headerCells = daysToShow.map(day => `<th>${day.slice(0, 3)}</th>`).join('');
  listDiv.innerHTML = `
    <table class="schedule-table">
      <thead>
        <tr>
          <th></th>${headerCells}
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>`;
}

// Display class summary information
function renderSummary(classList = getCurrentStudent().enrolledClasses) {
  const student = getCurrentStudent();
  const studentInfo = `${student.name} (${student.id})`;

  if (!classList.length) {
    summaryDiv.innerText = `${studentInfo} has no classes.`;
    return;
  }

  const totalMinutes = classList.reduce(
    (sum, classEntry) => sum + (toMinutes(classEntry.endTime) - toMinutes(classEntry.startTime)),
    0
  );

  const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
  const classCount = classList.length;

  summaryDiv.innerText = 
    `${studentInfo} has ${classCount} ${classCount === 1 ? 'class' : 'classes'} ` +
    `totaling ${totalHours} hour${totalHours === 1 ? '' : 's'}.`;
}

// ===== FILTERING AND SORTING =====

// Apply current filters and render appropriate view
function applyFilter() {
  const selectedDay = filterDaySelect.value;
  const searchTerm = searchInput.value.trim().toUpperCase();
  let filteredClasses = getCurrentStudent().enrolledClasses;

  // Filter by day
  if (selectedDay !== 'All') {
    filteredClasses = filteredClasses.filter(c => c.day === selectedDay);
  }

  // Filter by search term
  if (searchTerm) {
    filteredClasses = filteredClasses.filter(c => 
      c.code.toUpperCase().includes(searchTerm)
    );
  }

  // Render in current view mode
  if (isTableView) {
    renderTable(filteredClasses);
  } else {
    renderList(filteredClasses);
  }

  renderSummary(filteredClasses);
}

// ===== EVENT HANDLERS =====

// Attach handlers to dynamically created class entry buttons
function attachEntryHandlers() {
  // Edit buttons
  document.querySelectorAll('.edit-btn').forEach(button => {
    button.addEventListener('click', function(event) {
      clearErrors();
      editIndex = Number(event.currentTarget.dataset.index);
      
      const classToEdit = getCurrentStudent().enrolledClasses[editIndex];
      document.getElementById('code').value = classToEdit.code;
      document.getElementById('startTime').value = classToEdit.startTime;
      document.getElementById('endTime').value = classToEdit.endTime;
      
      // Set the correct day checkbox
      document.querySelectorAll('#day-group input').forEach(checkbox => {
        checkbox.checked = checkbox.value === classToEdit.day;
      });

      submitBtn.textContent = 'Update Class';
      applyFilter();
    });
  });

  // Cancel edit buttons
  document.querySelectorAll('.cancel-btn').forEach(button => {
    button.addEventListener('click', function() {
      editIndex = null;
      clearErrors();
      submitBtn.textContent = 'Add Class';
      form.reset();
      applyFilter();
    });
  });

  // Delete buttons with confirmation
  document.querySelectorAll('.delete-btn').forEach(button => {
    let deleteTimeout;

    button.addEventListener('click', function(event) {
      if (!button.classList.contains('confirming')) {
        // First click - show confirmation
        button.classList.add('confirming');
        button.textContent = 'Confirm Delete';

        deleteTimeout = setTimeout(() => {
          button.classList.remove('confirming');
          button.textContent = 'Delete';
        }, 5000);
      } else {
        // Second click - actually delete
        clearTimeout(deleteTimeout);
        const indexToDelete = Number(event.currentTarget.dataset.index);
        getCurrentStudent().removeClass(indexToDelete);
        applyFilter();
      }
    });
  });
}

// Update student dropdown with current student list
function refreshStudentDropdown() {
  studentSelect.innerHTML = students
    .map(student => `<option value="${student.id}">${student.name} (${student.id})</option>`)
    .join('');
  studentSelect.value = currentStudentId;
}

// Validate form inputs
function validateForm() {
  const errors = [];
  const codeValue = document.getElementById('code').value.trim();
  const checkedDays = Array.from(document.querySelectorAll('#day-group input:checked'))
    .map(checkbox => checkbox.value);
  const startValue = document.getElementById('startTime').value;
  const endValue = document.getElementById('endTime').value;

  if (!codeValue) {
    errors.push('Class code is required.');
    document.getElementById('code').classList.add('invalid');
  }

  if (checkedDays.length === 0) {
    errors.push('Select at least one day.');
    document.getElementById('day-group').classList.add('invalid');
  }

  if (!startValue || !endValue) {
    errors.push('Both start time and end time are required.');
    if (!startValue) document.getElementById('startTime').classList.add('invalid');
    if (!endValue) document.getElementById('endTime').classList.add('invalid');
  } else if (toMinutes(endValue) <= toMinutes(startValue)) {
    errors.push('End time must be after start time.');
    document.getElementById('startTime').classList.add('invalid');
    document.getElementById('endTime').classList.add('invalid');
  }

  return { errors, codeValue, checkedDays, startValue, endValue };
}

// ===== EVENT LISTENER SETUP =====

// Student management events
studentSelect.addEventListener('change', () => {
  currentStudentId = studentSelect.value;
  applyFilter();
});

addStudentBtn.addEventListener('click', () => {
  studentErrorDiv.innerText = '';
  const name = studentNameInput.value.trim();
  const id = studentIdInput.value.trim();

  if (!name || !id || students.some(s => s.id === id)) {
    studentErrorDiv.innerText = 'Invalid or duplicate student name/ID';
    return;
  }

  const newStudent = new Student(name, id);
  students.push(newStudent);
  currentStudentId = id;
  refreshStudentDropdown();
  applyFilter();

  studentNameInput.value = '';
  studentIdInput.value = '';
});

deleteStudentBtn.addEventListener('click', () => {
  if (!deleteStudentConfirm) {
    deleteStudentConfirm = true;
    deleteStudentBtn.textContent = 'Confirm Delete';
    deleteStudentBtn.classList.add('confirming');

    deleteStudentTimerId = setTimeout(() => {
      deleteStudentConfirm = false;
      deleteStudentBtn.textContent = 'Delete Student';
      deleteStudentBtn.classList.remove('confirming');
    }, 5000);
  } else {
    clearTimeout(deleteStudentTimerId);
    deleteStudentConfirm = false;
    deleteStudentBtn.textContent = 'Delete Student';
    deleteStudentBtn.classList.remove('confirming');

    const studentIndex = students.findIndex(s => s.id === currentStudentId);
    if (studentIndex > -1) students.splice(studentIndex, 1);

    currentStudentId = students.length ? students[0].id : null;
    refreshStudentDropdown();
    applyFilter();
  }
});

// Sorting events
sortCodeBtn.addEventListener('click', () => {
  sortConfig.field = 'code';
  sortConfig.asc = !sortConfig.asc;
  sortCodeBtn.textContent = `Sort by Class Code ${sortConfig.asc ? '▲' : '▼'}`;
  sortDayBtn.textContent = 'Sort by Day ▲';
  applyFilter();
});

// Day sorting - always chronological (no descending)
sortDayBtn.addEventListener('click', () => {
  sortConfig.field = 'day';
  sortConfig.asc = true;
  sortDayBtn.textContent = 'Sort by Day ▲';
  sortCodeBtn.textContent = 'Sort by Class Code ▲';
  applyFilter();
});

// View toggle event
toggleViewBtn.addEventListener('click', () => {
  isTableView = !isTableView;
  toggleViewBtn.textContent = isTableView ? 'View as List' : 'View as Table';
  
  // Hide list-specific controls in table view
  sortCodeBtn.hidden = isTableView;
  sortDayBtn.hidden = isTableView;
  
  applyFilter();
});

// Form submission
form.addEventListener('submit', event => {
  event.preventDefault();
  clearErrors();

  const { errors, codeValue, checkedDays, startValue, endValue } = validateForm();
  if (errors.length) {
    document.getElementById('error-container').innerHTML = 
      errors.map(error => `<div>${error}</div>`).join('');
    return;
  }

  if (editIndex !== null) {
    // Edit existing class
    const originalClass = getCurrentStudent().enrolledClasses.splice(editIndex, 1)[0];
    const addedClasses = [];
    let success = true;

    for (let day of checkedDays) {
      const updatedClass = new ClassEntry(codeValue, day, startValue, endValue);
      const error = getCurrentStudent().addClass(updatedClass);
      
      if (error) {
        success = false;
        // Remove any classes that were added
        addedClasses.forEach(addedClass => {
          const addedIndex = getCurrentStudent().enrolledClasses.indexOf(addedClass);
          if (addedIndex > -1) getCurrentStudent().enrolledClasses.splice(addedIndex, 1);
        });
        break;
      }
      addedClasses.push(updatedClass);
    }

    if (!success) {
      // Restore original class if edit failed
      getCurrentStudent().enrolledClasses.splice(editIndex, 0, originalClass);
      document.getElementById('error-container').innerHTML = 
        '<div>Time conflict or invalid time.</div>';
      return;
    }

    editIndex = null;
  } else {
    // Add new classes
    for (let day of checkedDays) {
      const newClass = new ClassEntry(codeValue, day, startValue, endValue);
      const error = getCurrentStudent().addClass(newClass);
      
      if (error) {
        document.getElementById('error-container').innerHTML = `<div>${error}</div>`;
        return;
      }
    }
  }

  applyFilter();
  form.reset();
  submitBtn.textContent = 'Add Class';
});

// Reset list with confirmation
let resetConfirming = false;
let resetTimeout;

resetBtn.addEventListener('click', () => {
  if (!resetConfirming) {
    resetConfirming = true;
    resetBtn.textContent = 'Confirm Reset';
    resetBtn.classList.add('confirming');

    resetTimeout = setTimeout(() => {
      resetConfirming = false;
      resetBtn.textContent = 'Reset List';
      resetBtn.classList.remove('confirming');
    }, 5000);
  } else {
    clearTimeout(resetTimeout);
    getCurrentStudent().enrolledClasses = [];
    applyFilter();
    
    resetConfirming = false;
    resetBtn.textContent = 'Reset List';
    resetBtn.classList.remove('confirming');
  }
});

// Clear errors when user starts typing
['code', 'startTime', 'endTime'].forEach(fieldId => {
  document.getElementById(fieldId).addEventListener('input', clearErrors);
});

document.querySelectorAll('#day-group input').forEach(checkbox => {
  checkbox.addEventListener('change', clearErrors);
});

// Filter and search events
filterDaySelect.addEventListener('change', applyFilter);
searchInput.addEventListener('input', applyFilter);

// ===== INITIALIZATION =====

// Start the application
populateTimeSelects();
refreshStudentDropdown();
applyFilter();