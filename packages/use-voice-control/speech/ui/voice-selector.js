import { VOICES } from './voices.js';

export function initVoiceSelector() {
    const voiceSelect = document.getElementById('voiceSelect');
    
    voiceSelect.innerHTML = '';
    
    const femaleVoices = [];
    const maleVoices = [];
    const otherVoices = [];
    
    Object.entries(VOICES).forEach(([id, voice]) => {
        const option = {
            id,
            name: voice.name,
            gender: voice.gender,
            traits: voice.traits || '',
            grade: voice.overallGrade || 'N/A'
        };
        
        if (voice.gender === 'Female') {
            femaleVoices.push(option);
        } else if (voice.gender === 'Male') {
            maleVoices.push(option);
        } else {
            otherVoices.push(option);
        }
    });
    
    const sortByGrade = (a, b) => {
        const gradeA = a.grade.charAt(0);
        const gradeB = b.grade.charAt(0);
        return gradeA.localeCompare(gradeB);
    };
    
    femaleVoices.sort(sortByGrade);
    maleVoices.sort(sortByGrade);
    otherVoices.sort(sortByGrade);
    
    const femaleGroup = document.createElement('optgroup');
    femaleGroup.label = 'Female Voices';
    
    const maleGroup = document.createElement('optgroup');
    maleGroup.label = 'Male Voices';
    
    const otherGroup = document.createElement('optgroup');
    otherGroup.label = 'Other Voices';
    
    femaleVoices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.id;
        option.textContent = `${voice.name} (${voice.grade})`;
        femaleGroup.appendChild(option);
    });
    
    maleVoices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.id;
        option.textContent = `${voice.name} (${voice.grade})`;
        maleGroup.appendChild(option);
    });
    
    otherVoices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.id;
        option.textContent = `${voice.name} (${voice.grade})`;
        otherGroup.appendChild(option);
    });
    
    if (femaleVoices.length > 0) voiceSelect.appendChild(femaleGroup);
    if (maleVoices.length > 0) voiceSelect.appendChild(maleGroup);
    if (otherVoices.length > 0) voiceSelect.appendChild(otherGroup);
    
    if (VOICES.af_heart) {
        voiceSelect.value = 'af_heart';
    }
}
