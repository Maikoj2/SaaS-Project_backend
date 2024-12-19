document.addEventListener('DOMContentLoaded', () => {
    // Obtener todos los inputs de resultados
    const resultInputs = document.querySelectorAll('.result');
    const detailsInputs = document.querySelectorAll('.details');

    // Función para actualizar los equipos en la siguiente ronda
    function updateNextRound(currentRound, result) {
        const rounds = document.querySelectorAll('.round');
        const currentRoundIndex = Array.from(rounds).indexOf(currentRound);
        
        if (currentRoundIndex < rounds.length - 1) {
            const nextRound = rounds[currentRoundIndex + 1];
            const [score1, score2] = result.split('-').map(s => parseInt(s.trim()));
            
            if (!isNaN(score1) && !isNaN(score2)) {
                const winner = score1 > score2 ? 
                    currentRound.querySelector('.team:first-child').textContent :
                    currentRound.querySelector('.team:last-child').textContent;
                
                const nextMatchup = nextRound.querySelector('.matchup');
                if (nextMatchup) {
                    const emptyTeam = nextMatchup.querySelector('.team:not(:has(*))');
                    if (emptyTeam) {
                        emptyTeam.textContent = winner;
                    }
                }
            }
        }
    }

    // Escuchar cambios en los resultados
    resultInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            const currentRound = e.target.closest('.round');
            updateNextRound(currentRound, e.target.value);
        });
    });

    // Guardar datos en localStorage
    function saveData() {
        const data = {
            results: Array.from(resultInputs).map(input => input.value),
            details: Array.from(detailsInputs).map(input => input.value)
        };
        localStorage.setItem('tournamentData', JSON.stringify(data));
    }

    // Cargar datos guardados
    function loadData() {
        const savedData = localStorage.getItem('tournamentData');
        if (savedData) {
            const data = JSON.parse(savedData);
            resultInputs.forEach((input, i) => input.value = data.results[i] || '');
            detailsInputs.forEach((input, i) => input.value = data.details[i] || '');
        }
    }

    // Guardar al cambiar cualquier input
    [...resultInputs, ...detailsInputs].forEach(input => {
        input.addEventListener('change', saveData);
    });

    // Cargar datos al iniciar
    loadData();
}); 