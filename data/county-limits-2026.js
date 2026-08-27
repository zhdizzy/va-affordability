// FORKED COPY (8/27/26) of tbv-tools/second-va-loan/data/county-limits-2026.js — that file is the source of truth.
// Refresh here whenever the parent is refreshed (grep tbv-tools/*/data/ for siblings).
export const CLL_BASELINE_2026 = 832750;

// Counties whose 2026 one-unit conforming loan limit exceeds the baseline.
// Source: FHFA Full County Loan Limit List 2026 (HERA-based), pulled 2026-07-08.
// Any county not listed here uses CLL_BASELINE_2026. Refresh each January.
export const HIGH_COST_COUNTIES = {
  "AK": {
    "Aleutians East Borough": 1249125,
    "Aleutians West Census Area": 1249125,
    "Anchorage Municipality": 1249125,
    "Bethel Census Area": 1249125,
    "Bristol Bay Borough": 1249125,
    "Chugach Census Area": 1249125,
    "Copper River Census Area": 1249125,
    "Denali Borough": 1249125,
    "Dillingham Census Area": 1249125,
    "Fairbanks North Star Borough": 1249125,
    "Haines Borough": 1249125,
    "Hoonah-Angoon Census Area": 1249125,
    "Juneau City and Borough": 1249125,
    "Kenai Peninsula Borough": 1249125,
    "Ketchikan Gateway Borough": 1249125,
    "Kodiak Island Borough": 1249125,
    "Kusilvak Census Area": 1249125,
    "Lake and Peninsula Borough": 1249125,
    "Matanuska-Susitna Borough": 1249125,
    "Nome Census Area": 1249125,
    "North Slope Borough": 1249125,
    "Northwest Arctic Borough": 1249125,
    "Petersburg Census Area": 1249125,
    "Prince of Wales-Hyder Census Area": 1249125,
    "Sitka City and Borough": 1249125,
    "Skagway Municipality": 1249125,
    "Southeast Fairbanks Census Area": 1249125,
    "Wrangell City and Borough": 1249125,
    "Yakutat City and Borough": 1249125,
    "Yukon-Koyukuk Census Area": 1249125
  },
  "CA": {
    "Alameda County": 1249125,
    "Contra Costa County": 1249125,
    "Los Angeles County": 1249125,
    "Marin County": 1249125,
    "Monterey County": 994750,
    "Napa County": 1017750,
    "Orange County": 1249125,
    "San Benito County": 1249125,
    "San Diego County": 1104000,
    "San Francisco County": 1249125,
    "San Luis Obispo County": 1000500,
    "San Mateo County": 1249125,
    "Santa Barbara County": 941850,
    "Santa Clara County": 1249125,
    "Santa Cruz County": 1249125,
    "Sonoma County": 897000,
    "Ventura County": 1035000
  },
  "CO": {
    "Adams County": 862500,
    "Arapahoe County": 862500,
    "Boulder County": 879750,
    "Broomfield County": 862500,
    "Clear Creek County": 862500,
    "Denver County": 862500,
    "Douglas County": 862500,
    "Eagle County": 1249125,
    "Elbert County": 862500,
    "Garfield County": 1209750,
    "Gilpin County": 862500,
    "Grand County": 883200,
    "Jefferson County": 862500,
    "Lake County": 1092500,
    "Moffat County": 1089050,
    "Park County": 862500,
    "Pitkin County": 1209750,
    "Routt County": 1089050,
    "San Miguel County": 994750,
    "Summit County": 1092500
  },
  "CT": {
    "Greater Bridgeport Planning Region": 977500,
    "Naugatuck Valley Planning Region": 851000,
    "Western Connecticut Planning Region": 977500
  },
  "DC": {
    "District of Columbia": 1249125
  },
  "FL": {
    "Monroe County": 990150
  },
  "GU": {
    "Guam": 1249125
  },
  "HI": {
    "Hawaii County": 1249125,
    "Honolulu County": 1249125,
    "Kalawao County": 1299500,
    "Kauai County": 1249125,
    "Maui County": 1299500
  },
  "ID": {
    "Teton County": 1249125
  },
  "MA": {
    "Dukes County": 1249125,
    "Essex County": 962550,
    "Middlesex County": 962550,
    "Nantucket County": 1249125,
    "Norfolk County": 962550,
    "Plymouth County": 962550,
    "Suffolk County": 962550
  },
  "MD": {
    "Calvert County": 1209750,
    "Charles County": 1249125,
    "Frederick County": 1249125,
    "Montgomery County": 1249125,
    "Prince George's County": 1249125
  },
  "NH": {
    "Rockingham County": 962550,
    "Strafford County": 962550
  },
  "NJ": {
    "Bergen County": 1209750,
    "Essex County": 1209750,
    "Hudson County": 1209750,
    "Hunterdon County": 1209750,
    "Middlesex County": 1209750,
    "Monmouth County": 1209750,
    "Morris County": 1209750,
    "Ocean County": 1209750,
    "Passaic County": 1209750,
    "Somerset County": 1209750,
    "Sussex County": 1209750,
    "Union County": 1209750
  },
  "NY": {
    "Bronx County": 1209750,
    "Kings County": 1209750,
    "Nassau County": 1209750,
    "New York County": 1209750,
    "Putnam County": 1209750,
    "Queens County": 1209750,
    "Richmond County": 1209750,
    "Rockland County": 1209750,
    "Suffolk County": 1209750,
    "Westchester County": 1209750
  },
  "PA": {
    "Pike County": 1209750
  },
  "TN": {
    "Cannon County": 1029250,
    "Cheatham County": 1029250,
    "Davidson County": 1029250,
    "Dickson County": 1029250,
    "Hickman County": 1029250,
    "Macon County": 1029250,
    "Maury County": 1029250,
    "Robertson County": 1029250,
    "Rutherford County": 1029250,
    "Smith County": 1029250,
    "Sumner County": 1029250,
    "Trousdale County": 1029250,
    "Williamson County": 1029250,
    "Wilson County": 1029250
  },
  "UT": {
    "Grand County": 839500,
    "Summit County": 1150000,
    "Wasatch County": 1150000,
    "Wayne County": 997050
  },
  "VA": {
    "Arlington County": 1249125,
    "Clarke County": 1249125,
    "Culpeper County": 1249125,
    "Fairfax County": 1249125,
    "Fauquier County": 1249125,
    "Loudoun County": 1249125,
    "Madison County": 1209750,
    "Prince William County": 1249125,
    "Rappahannock County": 1249125,
    "Spotsylvania County": 1249125,
    "Stafford County": 1249125,
    "Warren County": 1249125,
    "Alexandria City": 1249125,
    "Fairfax City": 1249125,
    "Falls Church City": 1249125,
    "Fredericksburg City": 1249125,
    "Manassas City": 1249125,
    "Manassas Park City": 1249125
  },
  "VI": {
    "St. Croix Island": 1249125,
    "St. John Island": 1249125,
    "St. Thomas Island": 1249125
  },
  "WA": {
    "King County": 1063750,
    "Pierce County": 1063750,
    "Snohomish County": 1063750
  },
  "WV": {
    "Jefferson County": 1249125
  },
  "WY": {
    "Teton County": 1249125
  }
};
