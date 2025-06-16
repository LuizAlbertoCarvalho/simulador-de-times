/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface Team {
    id: number;
    leader: string | null;
    players: string[];
    hasFemale: boolean;
}

document.addEventListener('DOMContentLoaded', () => {
    const playerNamesEl = document.getElementById('playerNames') as HTMLTextAreaElement;
    const numTeamsEl = document.getElementById('numTeams') as HTMLInputElement;
    const playersPerTeamEl = document.getElementById('playersPerTeam') as HTMLInputElement;
    const leaderNamesEl = document.getElementById('leaderNames') as HTMLTextAreaElement;
    const femalePlayerNamesEl = document.getElementById('femalePlayerNames') as HTMLTextAreaElement;
    const generateButton = document.getElementById('generateButton') as HTMLButtonElement;
    const resultsDiv = document.getElementById('results') as HTMLDivElement;
    const errorMessagesDiv = document.getElementById('errorMessages') as HTMLDivElement;

    generateButton.addEventListener('click', handleGenerateTeams);

    function displayError(messages: string[]) {
        errorMessagesDiv.innerHTML = messages.map(msg => `<p>${msg}</p>`).join('');
        errorMessagesDiv.style.display = messages.length > 0 ? 'block' : 'none';
        resultsDiv.innerHTML = '<p>Corrija os erros acima para gerar os times.</p>';
        if (messages.length > 0) {
            errorMessagesDiv.focus(); // Focus on errors for screen readers
        }
    }

    function clearMessages() {
        errorMessagesDiv.innerHTML = '';
        errorMessagesDiv.style.display = 'none';
        resultsDiv.innerHTML = '';
    }

    function shuffleArray<T>(array: T[]): T[] {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    function handleGenerateTeams() {
        clearMessages();
        generateButton.disabled = true;
        generateButton.setAttribute('aria-busy', 'true');

        try {
            const allPlayerNamesInput = playerNamesEl.value.split('\n').map(s => s.trim()).filter(s => s);
            const numTeams = parseInt(numTeamsEl.value);
            const playersPerTeam = parseInt(playersPerTeamEl.value);
            const leaderNamesInput = leaderNamesEl.value.split('\n').map(s => s.trim()).filter(s => s);
            const femalePlayerNamesInput = femalePlayerNamesEl.value.split('\n').map(s => s.trim()).filter(s => s);

            const errors: string[] = [];

            // --- Validation ---
            if (allPlayerNamesInput.length === 0) errors.push("A lista de jogadores não pode estar vazia.");
            if (isNaN(numTeams) || numTeams <= 0) errors.push("Número de times inválido. Deve ser maior que zero.");
            if (isNaN(playersPerTeam) || playersPerTeam <= 0) errors.push("Número de jogadores por time inválido. Deve ser maior que zero.");

            if (errors.length > 0) { // Early exit for basic numerical errors
                displayError(errors);
                generateButton.disabled = false;
                generateButton.removeAttribute('aria-busy');
                return;
            }
            
            const uniquePlayerNames = Array.from(new Set(allPlayerNamesInput));
            if (uniquePlayerNames.length !== allPlayerNamesInput.length) {
                 errors.push("Existem nomes duplicados na lista de jogadores. Remova as duplicatas.");
            }

            leaderNamesInput.forEach(leader => {
                if (!uniquePlayerNames.includes(leader)) {
                    errors.push(`Líder '${leader}' não encontrado na lista de jogadores.`);
                }
            });
            const uniqueLeaderNames = Array.from(new Set(leaderNamesInput));
            if (uniqueLeaderNames.length !== leaderNamesInput.length) {
                 errors.push("Existem nomes duplicados na lista de líderes.");
            }


            femalePlayerNamesInput.forEach(female => {
                if (!uniquePlayerNames.includes(female)) {
                    errors.push(`Mulher '${female}' não encontrada na lista de jogadores.`);
                }
            });
             const uniqueFemalePlayerNames = Array.from(new Set(femalePlayerNamesInput));
            if (uniqueFemalePlayerNames.length !== femalePlayerNamesInput.length) {
                 errors.push("Existem nomes duplicados na lista de mulheres.");
            }

            if (uniqueLeaderNames.length > numTeams) {
                errors.push("O número de líderes não pode ser maior que o número de times.");
            }
            if (uniquePlayerNames.length < numTeams * playersPerTeam) {
                errors.push("Não há jogadores suficientes para formar os times com a configuração desejada.");
            }
            
            // Check for players listed as both leader and female, but also in general players only once
            uniqueLeaderNames.forEach(leader => {
                if (uniqueFemalePlayerNames.includes(leader) && uniquePlayerNames.filter(p => p === leader).length > 1) { // This check might be redundant if uniquePlayerNames is truly unique
                     errors.push(`Jogador '${leader}' está listado como líder e mulher, mas parece estar duplicado. Cada jogador deve ser único na lista geral.`);
                }
            });


            if (errors.length > 0) {
                displayError(errors);
                generateButton.disabled = false;
                generateButton.removeAttribute('aria-busy');
                return;
            }

            // --- Team Generation Logic ---
            const teams: Team[] = [];
            for (let i = 0; i < numTeams; i++) {
                teams.push({ id: i + 1, leader: null, players: [], hasFemale: false });
            }

            let availablePlayers = [...uniquePlayerNames];

            // 1. Assign Leaders
            const shuffledLeaders = shuffleArray(uniqueLeaderNames);
            for (let i = 0; i < Math.min(shuffledLeaders.length, numTeams); i++) {
                const leader = shuffledLeaders[i];
                teams[i].leader = leader;
                teams[i].players.push(leader);
                if (uniqueFemalePlayerNames.includes(leader)) {
                    teams[i].hasFemale = true;
                }
                availablePlayers = availablePlayers.filter(p => p !== leader);
            }

            // 2. Prepare and Distribute Female Players (who are not leaders)
            let distributableFemales = uniqueFemalePlayerNames.filter(
                female => !shuffledLeaders.includes(female) && availablePlayers.includes(female)
            );
            distributableFemales = shuffleArray(distributableFemales);

            // First pass: ensure each team gets a female if possible and needed
            for (const team of teams) {
                if (!team.hasFemale && team.players.length < playersPerTeam && distributableFemales.length > 0) {
                    const femalePlayer = distributableFemales.pop()!;
                    team.players.push(femalePlayer);
                    team.hasFemale = true;
                    availablePlayers = availablePlayers.filter(p => p !== femalePlayer);
                }
            }

            // Second pass: distribute remaining females
            let teamsSortedByPlayerCount = [...teams].sort((a,b) => a.players.length - b.players.length);
            while (distributableFemales.length > 0) {
                let femaleAssignedInThisRound = false;
                for (const team of teamsSortedByPlayerCount) { 
                    if (team.players.length < playersPerTeam && distributableFemales.length > 0) {
                        const femalePlayer = distributableFemales.pop()!;
                        team.players.push(femalePlayer);
                        team.hasFemale = true; 
                        availablePlayers = availablePlayers.filter(p => p !== femalePlayer);
                        femaleAssignedInThisRound = true;
                    }
                     if (distributableFemales.length === 0) break;
                }
                if (!femaleAssignedInThisRound && distributableFemales.length > 0) {
                    console.warn("Algumas jogadoras não puderam ser alocadas pois os times estão cheios ou não há mais espaço prioritário para mulheres.");
                    break; 
                }
                teamsSortedByPlayerCount.sort((a,b) => a.players.length - b.players.length); // Re-sort for next distribution
            }
            
            // 3. Distribute Remaining Players
            availablePlayers = shuffleArray(availablePlayers);
            teamsSortedByPlayerCount = [...teams].sort((a,b) => a.players.length - b.players.length); // Sort teams by current player count

            for (const team of teamsSortedByPlayerCount) { // Prioritize teams with fewer players
                while (team.players.length < playersPerTeam && availablePlayers.length > 0) {
                    const player = availablePlayers.pop()!;
                    team.players.push(player);
                }
            }
            // If some players remain and teams are not full (unlikely with current logic but as a safeguard)
            // Or if playersPerTeam * numTeams < uniquePlayerNames.length, some players will be left over.
            // This loop ensures we try to fill teams as much as possible with remaining players.
            let safetyNetIterations = availablePlayers.length; // Max iterations to prevent infinite loops
            while(availablePlayers.length > 0 && safetyNetIterations > 0) {
                let playerAssignedInRound = false;
                teamsSortedByPlayerCount.sort((a,b) => a.players.length - b.players.length);
                for (const team of teamsSortedByPlayerCount) {
                    if (team.players.length < playersPerTeam && availablePlayers.length > 0) {
                        const player = availablePlayers.pop()!;
                        team.players.push(player);
                        playerAssignedInRound = true;
                    }
                }
                if (!playerAssignedInRound) break; // No team could take more players
                safetyNetIterations--;
            }


            // --- Display Results ---
            const sortedTeamsById = [...teams].sort((a,b) => a.id - b.id);
            if (sortedTeamsById.some(team => team.players.length > 0)) { // Check if at least one team was formed
                 resultsDiv.innerHTML = sortedTeamsById.map(team => {
                    const leaderDisplay = team.leader ? `<strong>${team.leader} (Líder)</strong>` : 'Sem líder designado';
                    // Ensure players are unique in the display and leader is not repeated if also in general players list.
                    const otherPlayerNames = team.players.filter(p => p !== team.leader);
                    const uniqueOtherPlayerNames = Array.from(new Set(otherPlayerNames));

                    let teamString = `<p><strong>Time ${team.id}:</strong> ${leaderDisplay}`;
                    if (uniqueOtherPlayerNames.length > 0) {
                        teamString += `; ${uniqueOtherPlayerNames.join('; ')}`;
                    }
                     teamString += ` <span class="team-stats">(Jogadoras: ${team.players.length}/${playersPerTeam})</span></p>`;
                    return `<div class="team-output" role="listitem">${teamString}</div>`;
                }).join('');
                resultsDiv.setAttribute('role', 'list');
            } else {
                resultsDiv.innerHTML = '<p>Não foi possível gerar os times com os jogadores e configurações fornecidas. Verifique as entradas e tente novamente.</p>';
            }


        } catch (e) {
            console.error("Erro ao gerar times:", e);
            displayError(["Ocorreu um erro inesperado. Verifique o console para mais detalhes."]);
        } finally {
            generateButton.disabled = false;
            generateButton.removeAttribute('aria-busy');
        }
    }
});