// ==UserScript==
// @name          WaniKani Dashboard Leech List
// @namespace     https://www.wanikani.com
// @description   Shows top leeches on dashboard (replaces critical items) and all leeches on a dedicated page (replaces critical items)
// @author        ukebox
// @version       1.2.1
// @require       https://code.jquery.com/jquery-3.3.1.min.js#sha256=FgpCb/KJQlLNfOu91ta32o/NMZxltwRo8QtmkMRdAu8=
// @require       https://cdn.jsdelivr.net/npm/@iconfu/svg-inject@1.0.5/dist/svg-inject.min.js#sha256=HRZfUR7ozgnjacG4J44e4QBkqBa3r0e8WaW+Y/Azb8o=
// @include       https://www.wanikani.com/dashboard
// @include       https://www.wanikani.com/
// @include       https://www.wanikani.com/critical-items
// @grant         none
// @run-at        document-end
// ==/UserScript==

/*
jshint esversion: 6
*/

(function() {
    'use strict';

    let dom = {};
    dom.$ = jQuery.noConflict(true);

    //custom style for radical svg's - white strokes, fixed size
    dom.$('head').append(`<style type="text/css">
                            svg.radical {
                              fill: none;
                              stroke: #fff;
                              stroke-width: 68;
                              stroke-linecap: square;
                              stroke-miterlimit: 2;
                              shape-rendering: geometricPrecision;
                              height: 1em;
                              width: 1em;
                            }
                          </style>`);

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
            },
            filter: {
                srs: '1..8'
            }
        }
    };

    window.wkof.include('ItemData');
    window.wkof.ready('ItemData').then(getItems).then(getLeeches).then(updatePage);

    function getItems(items) {
        return window.wkof.ItemData.get_items(config);
    }

    function getLeeches(items) {
        return items.filter(item => isLeech(item));
    }

    function isLeech(item) {
        if (item.review_statistics === undefined) {
            return false;
        }

        let reviewStats = item.review_statistics;
        let meaningScore = getLeechScore(reviewStats.meaning_incorrect, reviewStats.meaning_current_streak);
        let readingScore = getLeechScore(reviewStats.reading_incorrect, reviewStats.reading_current_streak);

        item.leech_score = Math.max(meaningScore, readingScore);

        return meaningScore >= leechThreshold || readingScore >= leechThreshold;
    }

    function getLeechScore(incorrect, currentStreak) {
        return incorrect / Math.pow((currentStreak || 0.5), 1.5);
    }

    function updatePage(items) {

        let is_dashboard = window.location.pathname != "/critical-items";

        if (is_dashboard) {
            items = items.sort((a, b) => b.leech_score - a.leech_score).slice(0,10);
        } else {
            items = items.sort((a, b) => b.leech_score - a.leech_score);
        }

        console.log(items);

        makeLeechList(items, is_dashboard);
    }

    function round(number, decimals)
    {
        return +(Math.round(number + "e+" + decimals) + "e-" + decimals);
    }

    function makeLeechList(items, for_dashboard) {
        var rows = "";
        items.forEach(item => {
            let type = item.assignments.subject_type;
            let representation = "";

            //The slug of a radical just has its name, we want the actual symbol
            if (type === "radical" && item.data.character_images && !item.data.characters) {
                let image_data = item.data.character_images.find(x => x.content_type === "image/svg+xml" && !x.metadata.inline_styles);
                if (image_data) {
                    //svg injection - this injects the svg directly into the html, which allows for custom CSS styling
                    representation = `<img style="height: 1em; width: 1em;" src="${image_data.url}" onload="SVGInject(this)" />`;
                }
            } else if (type === 'radical' && item.data.characters) {
                //use characters for radicals when possible
                representation = item.data.characters;
            } else {
                //use slug for kanji and vocab
                representation = item.data.slug;
            }

            let row = `<tr class="${item.object}"><td><a href="${item.data.document_url}"><span lang="ja">${representation}</span><span class="pull-right">${round(item.leech_score, 2)}</span></a></td></tr>`;
            rows+=row;
        });

        let sectionContent = `<h3 class="small-caps">${for_dashboard ? 'Top ' : ''}Leeches</h3>
                              <table>
                                <tbody style="display: table-row-group;">
                                  ${rows}
                                </tbody>
                              </table>
                              <div class="see-more">
                                <a class="small-caps" ${for_dashboard ? 'href="critical-items"' : ''}>${for_dashboard ? 'See More Leeches...' : items.length + ' leeches total'}</a>
                              </div>`;
        dom.$('.low-percentage').html(sectionContent);
    }

})();
