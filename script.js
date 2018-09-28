// ==UserScript==
// @name          WaniKani Dashboard Leech List
// @namespace     https://www.wanikani.com
// @description   Show SRS and leech breakdown on dashboard
// @author        ukebox
// @version       1.1.0
// @include       https://www.wanikani.com/dashboard
// @include       https://www.wanikani.com/
// @grant         none
// ==/UserScript==

(function() {
    'use strict';

	if (!window.wkof) {
		let response = confirm('WaniKani Dashboard Leech List script requires WaniKani Open Framework.\n Click "OK" to be forwarded to installation instructions.');

		if (response) {
			window.location.href = 'https://community.wanikani.com/t/instructions-installing-wanikani-open-framework/28549';
		}

		return;
	}

	const leechThreshold = 1;
	const config = {
		wk_items: {
			options: {
				review_statistics: true,
				assignments: true
			}
		}
	};
    let allItems

	wkof.include('ItemData');
	wkof.ready('ItemData').then(getItems).then(getLeechScores).then(updatePage);

	function getItems(items) {
		return wkof.ItemData.get_items(config).then(filterToActiveAssignments);
	}

	function filterToActiveAssignments(items) {
		return items.filter(itemIsActiveAssignment);
	}

	function itemIsActiveAssignment(item) {
		let assignments = item.assignments;
		if (assignments === undefined) {
			return false;
		}

		let srsStage = getSrsStage(assignments);

		return srsStage >= 1 && srsStage <= 8;
	}

    function getSrsStage(assignments) {
		return assignments.srs_stage;
	}

	function getLeechScores(items) {

		items.forEach(function(item) {
			isLeech(item)
		});

		return items;
	}

	function isLeech(item) {
		if (item.review_statistics === undefined) {
			return false;
		}

		let reviewStats = item.review_statistics;
		let meaningScore = getLeechScore(reviewStats.meaning_incorrect, reviewStats.meaning_current_streak);
		let readingScore = getLeechScore(reviewStats.reading_incorrect, reviewStats.reading_current_streak);

        item.leech_score = Math.max(meaningScore, readingScore)

		return meaningScore >= leechThreshold || readingScore >= leechThreshold;
	}

	function getLeechScore(incorrect, currentStreak) {
		return incorrect / Math.pow((currentStreak || 0.5), 1.5);
	}

	function updatePage(items) {

        items = items.sort(function(a, b){return b.leech_score - a.leech_score}).slice(0,10);

        console.log(items)

        addTopLeechList(items)
	}
  function round(number, decimals)
      {
          return +(Math.round(number + "e+" + decimals) + "e-" + decimals);
      }

      function addTopLeechList(topLeeches) {
          var rows = ""
          topLeeches.forEach(function(item) {
              let row = `<tr class="${item.object}"><td><a href="${item.data.document_url}"><span lang="ja">${item.data.slug}</span><span class="pull-right">${round(item.leech_score, 2)}</span></a></td></tr>`
              rows+=row;
          });

          let sectionContent = `<h3 class="small-caps">Top Leeches</h3>
                    <table>
                      <tbody style="display: table-row-group;">
                        ${rows}
                      </tbody>
                    </table>`
          $('.low-percentage').html(sectionContent)
      }
})();
