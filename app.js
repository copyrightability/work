// app.js
const form = document.getElementById('profileForm');
const planBtn = document.getElementById('planBtn');
const results = document.getElementById('results');
const summary = document.getElementById('summary');
const dietDiv = document.getElementById('diet');
const workoutDiv = document.getElementById('workout');

const hasJob = document.getElementById('hasJob');
const hasSchool = document.getElementById('hasSchool');
const jobTimes = document.getElementById('jobTimes');
const schoolTimes = document.getElementById('schoolTimes');

const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');

function showHideSchedule(){
  jobTimes.classList.toggle('hidden', !hasJob.checked);
  schoolTimes.classList.toggle('hidden', !hasSchool.checked);
}
hasJob.addEventListener('change', showHideSchedule);
hasSchool.addEventListener('change', showHideSchedule);
showHideSchedule();

// helper: parse time strings "HH:MM" to minutes
function timeToMins(t){
  if(!t) return null;
  const [h,m] = t.split(':').map(Number);
  return h*60 + m;
}
function minsToTime(m){
  if(m==null) return '—';
  const hh = Math.floor(m/60)%24;
  const mm = m%60;
  return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
}

function loadData(){
  try{
    const raw = localStorage.getItem('fitplan_data');
    if(!raw) return null;
    return JSON.parse(raw);
  }catch(e){ return null; }
}
function saveData(obj){
  localStorage.setItem('fitplan_data', JSON.stringify(obj));
}

function parseInputs(){
  const age = Number(document.getElementById('age').value) || 25;
  const gender = document.getElementById('gender').value;
  const ft = Number(document.getElementById('heightFt').value) || 5;
  const inch = Number(document.getElementById('heightIn').value) || 9;
  const weightLbs = Number(document.getElementById('weightLbs').value) || 160;
  const activityFactor = Number(document.getElementById('activityLevel').value) || 1.2;

  const job = hasJob.checked;
  const school = hasSchool.checked;
  const jobStart = timeToMins(document.getElementById('jobStart').value);
  const jobEnd = timeToMins(document.getElementById('jobEnd').value);
  const schoolStart = timeToMins(document.getElementById('schoolStart').value);
  const schoolEnd = timeToMins(document.getElementById('schoolEnd').value);
  const jobActive = document.getElementById('jobActive').checked;
  const schoolActive = document.getElementById('schoolActive').checked;

  return {
    age,gender,ft,inch,weightLbs,activityFactor,
    job,jobStart,jobEnd,jobActive,
    school,schoolStart,schoolEnd,schoolActive,
    createdAt: new Date().toISOString()
  };
}

// BMR (Mifflin-St Jeor) — needs weight(kg) and height(cm)
function computeBMR(age, gender, weightKg, heightCm){
  let bmr = 10*weightKg + 6.25*heightCm - 5*age;
  if(gender === 'male') bmr += 5;
  else if(gender === 'female') bmr -= 161;
  // 'other' uses neutral average
  return Math.round(bmr);
}

// Make a simple meal plan by calories and macros
function makeDiet(tdee){
  // Suggest slight deficit for most users (lose ~0.25-0.5kg/mo) — here keep neutral and show ranges
  const maintain = Math.round(tdee);
  const lose = Math.round(tdee - 300);
  const gain = Math.round(tdee + 300);

  function macros(cal){
    // default: 30% protein, 35% carbs, 35% fat
    const pCal = Math.round(cal * 0.30);
    const cCal = Math.round(cal * 0.35);
    const fCal = Math.round(cal * 0.35);
    return {
      protein_g: Math.round(pCal / 4),
      carbs_g: Math.round(cCal / 4),
      fat_g: Math.round(fCal / 9)
    };
  }

  return {
    maintain:{cal:maintain, ...macros(maintain)},
    lose:{cal:lose, ...macros(lose)},
    gain:{cal:gain, ...macros(gain)},
    advice: "Aim for whole foods, protein with every meal, plenty of vegetables, and stay hydrated. Adjust calories slowly based on progress."
  };
}

// Create a single-day workout that fits into free windows
function planWorkout(profile){
  // Full day = 0..1440 minutes. We'll find free blocks outside job/school and place a workout.
  const occupied = [];
  if(profile.job && profile.jobStart!=null && profile.jobEnd!=null){
    occupied.push([profile.jobStart, profile.jobEnd, profile.jobActive]);
  }
  if(profile.school && profile.schoolStart!=null && profile.schoolEnd!=null){
    occupied.push([profile.schoolStart, profile.schoolEnd, profile.schoolActive]);
  }

  // Merge occupied and sort
  occupied.sort((a,b)=>a[0]-b[0]);
  const merged=[];
  for(const seg of occupied){
    if(!merged.length) merged.push(seg);
    else{
      const last = merged[merged.length-1];
      if(seg[0] <= last[1]){
        last[1] = Math.max(last[1], seg[1]);
        last[2] = last[2] || seg[2];
      } else merged.push(seg);
    }
  }

  // Build free slots
  const freeSlots = [];
  let cursor = 6*60; // start searching from 6:00
  for(const s of merged){
    if(s[0] - cursor >= 20) freeSlots.push([cursor, s[0]]);
    cursor = Math.max(cursor, s[1]);
  }
  // end of day slot
  if(24*60 - cursor >= 20) freeSlots.push([cursor, 24*60]);

  // Choose a slot for a ~30-50 min workout
  // Prefer morning (before 09:30) or after work; otherwise first available
  function selectSlot(){
    const morning = freeSlots.filter(s=>s[1] <= (9.5*60) && s[1]-s[0]>=20);
    if(morning.length) return morning[0];
    const afterWork = freeSlots.filter(s=>s[0] >= 17*60 && s[1]-s[0] >= 20);
    if(afterWork.length) return afterWork[0];
    return freeSlots[0] || null;
  }
  const slot = selectSlot();

  // Build workout based on age and activity
  const age = profile.age;
  const jobActive = merged.some(s=>s[2]);
  const intensity = (profile.activityFactor >= 1.55 || jobActive) ? 'moderate' : 'light';

  let routine = [];
  if(!slot){
    routine.push("No free slot of at least 20 minutes detected today. Try short mobility sessions or walk during breaks.");
  } else {
    const duration = Math.min(50, Math.max(20, Math.floor((slot[1]-slot[0]) * 0.6)));
    const start = slot[0] + 5; // small cushion
    const warm = Math.min(7, Math.round(duration*0.15));
    const main = Math.round(duration - warm - 5);
    routine.push(`Workout time: ${minsToTime(start)} — ${minsToTime(start + duration)} (~${duration} min)`);
    routine.push(`Warm-up: ${warm} min — mobility, joint sweeps, light cardio (march in place, jump rope)`);
    if(intensity === 'light'){
      routine.push(`Main: ${main} min — full-body circuit (bodyweight)`);
      routine.push(`• 3 rounds: 10 squats, 8 incline push-ups, 12 walking lunges (total), 20s plank`);
    } else {
      routine.push(`Main: ${main} min — strength + cardio mix`);
      routine.push(`• 4 rounds: 8 goblet squats / 10 push-ups / 12 bent-over rows (or dumbbell rows) / 30s moderate intensity cardio`);
    }
    routine.push(`Cooldown: 5 min — stretching, breathing.`);
    if(age >= 55) routine.push("Note: focus on joint-friendly movements and lower impact. Reduce intensity as needed.");
  }

  return {
    freeSlots, chosenSlot: slot, routine, intensity
  };
}

// Main generate
function generatePlan(){
  const profile = parseInputs();

  // convert units
  const heightCm = Math.round((profile.ft * 12 + profile.inch) * 2.54);
  const weightKg = Math.round(profile.weightLbs * 0.453592 * 10) / 10;

  const bmr = computeBMR(profile.age, profile.gender, weightKg, heightCm);
  const tdee = Math.round(bmr * profile.activityFactor);

  const diet = makeDiet(tdee);
  const workoutPlan = planWorkout(profile);

  const result = {
    profile, heightCm, weightKg, bmr, tdee, diet, workoutPlan
  };

  saveData(result);
  showResults(result);
}

// Display
function showResults(res){
  results.classList.remove('hidden');
  summary.innerHTML = `
    <strong>Age:</strong> ${res.profile.age} • <strong>Gender:</strong> ${res.profile.gender} • <strong>Height:</strong> ${res.heightCm} cm • <strong>Weight:</strong> ${res.weightKg} kg
    <br><strong>BMR:</strong> ${res.bmr} kcal/day • <strong>TDEE:</strong> ${res.tdee} kcal/day (activity factor ${res.profile.activityFactor})
  `;
  dietDiv.innerText = `
Maintenance: ${res.diet.maintain.cal} kcal — Protein ${res.diet.maintain.protein_g} g • Carbs ${res.diet.maintain.carbs_g} g • Fat ${res.diet.maintain.fat_g} g

Weight loss (suggested): ${res.diet.lose.cal} kcal — Protein ${res.diet.lose.protein_g} g • Carbs ${res.diet.lose.carbs_g} g • Fat ${res.diet.lose.fat_g} g

Weight gain (suggested): ${res.diet.gain.cal} kcal — Protein ${res.diet.gain.protein_g} g • Carbs ${res.diet.gain.carbs_g} g • Fat ${res.diet.gain.fat_g} g

Advice: ${res.diet.advice}
  `;

  workoutDiv.innerText = res.workoutPlan.routine.join("\n");
}

// load saved automatically
const saved = loadData();
if(saved){
  // prefill form with saved profile values if present
  try{
    const p = saved.profile;
    if(p){
      document.getElementById('age').value = p.age || 25;
      document.getElementById('gender').value = p.gender || 'male';
      document.getElementById('heightFt').value = p.ft || 5;
      document.getElementById('heightIn').value = p.inch || 9;
      document.getElementById('weightLbs').value = p.weightLbs || 160;
      document.getElementById('activityLevel').value = p.activityFactor || 1.2;
      hasJob.checked = !!p.job;
      hasSchool.checked = !!p.school;
      if(p.jobStart!=null) document.getElementById('jobStart').value = (p.jobStart/60).toString().padStart(2,'0') + ':' + String(p.jobStart%60).padStart(2,'0');
      if(p.jobEnd!=null) document.getElementById('jobEnd').value = (p.jobEnd/60).toString().padStart(2,'0') + ':' + String(p.jobEnd%60).padStart(2,'0');
      if(p.schoolStart!=null) document.getElementById('schoolStart').value = (p.schoolStart/60).toString().padStart(2,'0') + ':' + String(p.schoolStart%60).padStart(2,'0');
      if(p.schoolEnd!=null) document.getElementById('schoolEnd').value = (p.schoolEnd/60).toString().padStart(2,'0') + ':' + String(p.schoolEnd%60).padStart(2,'0');
      document.getElementById('jobActive').checked = !!p.jobActive;
      document.getElementById('schoolActive').checked = !!p.schoolActive;
    }
    showHideSchedule();
    showResults(saved);
  }catch(e){}
}

planBtn.addEventListener('click', generatePlan);

// Export / Import
exportBtn.addEventListener('click', ()=>{
  const data = localStorage.getItem('fitplan_data') || '{}';
  const blob = new Blob([data], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'fitplan-data.json'; a.click();
  URL.revokeObjectURL(url);
});

importBtn.addEventListener('click', ()=> importFile.click());
importFile.addEventListener('change', (e)=>{
  const f = e.target.files[0];
  if(!f) return;
  const r = new FileReader();
  r.onload = () => {
    try{
      const parsed = JSON.parse(r.result);
      localStorage.setItem('fitplan_data', JSON.stringify(parsed));
      location.reload();
    }catch(err){ alert('Invalid JSON'); }
  };
  r.readAsText(f);
});

// Service worker registration for PWA
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').catch(()=>{/* ignore */});
}
