const profileForm = document.getElementById('profileForm');
const results = document.getElementById('results');
const summary = document.getElementById('summary');
const dietDiv = document.getElementById('diet');
const workoutDiv = document.getElementById('workout');
const progressTable = document.querySelector('#progressTable tbody');


let userData = JSON.parse(localStorage.getItem('fitplanUser')) || { progress: [] };


function saveUserData() {
localStorage.setItem('fitplanUser', JSON.stringify(userData));
}


function renderProgress() {
progressTable.innerHTML = '';
userData.progress.forEach(p => {
const tr = document.createElement('tr');
tr.innerHTML = `<td>${new Date(p.date).toLocaleDateString()}</td><td>${p.weight}</td>`;
progressTable.appendChild(tr);
});
}


function generatePlan() {
const age = Number(document.getElementById('age').value);
const gender = document.getElementById('gender').value;
const heightFt = Number(document.getElementById('heightFt').value);
const heightIn = Number(document.getElementById('heightIn').value);
const weightLbs = Number(document.getElementById('weightLbs').value);


const bmi = Math.round(weightLbs / (((heightFt*12+heightIn)*0.0254)**2));


summary.textContent = `Age: ${age}, Gender: ${gender}, BMI: ${bmi}`;
dietDiv.textContent = `Sample diet: Proteins + carbs + vegetables based on your weight ${weightLbs}lbs.`;
workoutDiv.textContent = `Sample workout: 45 min split around your schedule.`;


results.classList.remove('hidden');
}


document.getElementById('planBtn').addEventListener('click', () => {
generatePlan();
// save form data
userData.age = Number(document.getElementById('age').value);
userData.gender = document.getElementById('gender').value;
userData.heightFt = Number(document.getElementById('heightFt').value);
userData.heightIn = Number(document.getElementById('heightIn').value);
userData.weightLbs = Number(document.getElementById('weightLbs').value);
saveUserData();
renderProgress();
});


document.getElementById('addProgressBtn').addEventListener('click', () => {
const w = Number(document.getElementById('progressWeight').value);
if (w) {
userData.progress.push({ date: Date.now(), weight: w });
saveUserData();
renderProgress();
document.getElementById('progressWeight').value = '';
}
});


document.getElementById('exportBtn').addEventListener('click', () => {
const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a'); a.href = url; a.download = 'fitplan-data.json'; a.click();
});


document.getElementById('importBtn').addEventListener('click', () => {
document.getElementById('importFile').click();
});


document.getElementById('importFile').addEventListener('change', (e) => {
const file = e.target.files[0];
if (!file) return;
const reader = new FileReader();
reader.onload = () => {
try { userData = JSON.parse(reader.result); saveUserData(); renderProgress(); alert('Data imported'); } catch(e) { alert('Invalid JSON'); }
};
reader.readAsText(file);
});


window.addEventListener('load', () => { renderProgress(); if(userData.age) generatePlan(); });
