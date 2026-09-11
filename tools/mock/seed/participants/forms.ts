import type { Form } from "../../src/types.ts"

/**
 * wsj27-project-api's form template, `src/app/forms_template.json`, question for question and
 * in its own order: which questions leave the service, under which tab and section, and the
 * key and wording each one carries. A question that is not here is one the real service does
 * not publish, so a change to the template is copied here whole rather than edited in.
 */
export const forms: readonly Form[] = [
  {
    id: "avdelningsledare_kontingentledning",
    tabs: [
      {
        title: "Grundläggande information",
        sections: [
          {
            title: "Annan nödkontakt",
            questions: [
              {
                id: "90975",
                key: "hasAlternateEmergencyContact",
                label: "Vill du ange annan nödkontakt än de som står i förra sektionen?",
              },
              {
                id: "90976",
                key: "emergencyContact1Name",
                label: "Primär nödkontakt - Namn",
              },
              {
                id: "90977",
                key: "emergencyContact1Email",
                label: "Primär nödkontakt - E-post",
              },
              {
                id: "90978",
                key: "emergencyContact1Phone",
                label: "Primär nödkontakt - Mobiltelefon",
              },
              {
                id: "90979",
                key: "emergencyContact1Relation",
                label: "Primär nödkontakt - Relation",
              },
              {
                id: "90980",
                key: "emergencyContact2Name",
                label: "Sekundär nödkontakt - Namn",
              },
              {
                id: "90981",
                key: "emergencyContact2Email",
                label: "Sekundär nödkontakt - E-post",
              },
              {
                id: "90982",
                key: "emergencyContact2Phone",
                label: "Sekundär nödkontakt - Mobiltelefon",
              },
              {
                id: "90983",
                key: "emergencyContact2Relation",
                label: "Sekundär nödkontakt - Relation",
              },
            ],
          },
          {
            title: "Information redan i Scoutnet",
            questions: [
              {
                id: "90954",
                key: "email",
                label: "Din e-postadress",
              },
              {
                id: "90955",
                key: "alternateEmail",
                label: "Alternativ e-postadress",
              },
              {
                id: "90956",
                key: "mobilePhone",
                label: "Ansökandes mobiltelefon",
              },
              {
                id: "90957",
                key: "nextOfKin1Name",
                label: "Närstående 1 - Namn",
              },
              {
                id: "90958",
                key: "nextOfKin1Email",
                label: "Närstående 1 - E-post",
              },
              {
                id: "90959",
                key: "nextOfKin1Phone",
                label: "Närstående 1 - Mobiltelefon",
              },
              {
                id: "90960",
                key: "nextOfKin1Relation",
                label: "Närstående 1 - Relation",
              },
              {
                id: "90961",
                key: "nextOfKin2Name",
                label: "Närstående 2 - Namn",
              },
              {
                id: "90962",
                key: "nextOfKin2Email",
                label: "Närstående 2 - E-post",
              },
              {
                id: "90963",
                key: "nextOfKin2Phone",
                label: "Närstående 2 - Mobiltelefon",
              },
              {
                id: "90964",
                key: "nextOfKin2Relation",
                label: "Närstående 2 - Relation",
              },
            ],
          },
        ],
      },
      {
        title: "Hälsoinformation",
        sections: [
          {
            title: "Diet och födoämnesallergier",
            questions: [
              {
                id: "93221",
                key: "specialDiet",
                label: "Har du behov av specialkost?",
              },
              {
                id: "93222",
                key: "specialDietDetails",
                label: "Beskriv din specialkost i detalj",
              },
              {
                id: "93223",
                key: "hasFoodAllergy",
                label: "Har du någon födoämnesrelaterad allergi eller intolerans?",
              },
              {
                id: "93225",
                key: "foodAllergyLegumes",
                label: "Baljväxter",
              },
              {
                id: "93226",
                key: "foodAllergyFish",
                label: "Fisk",
              },
              {
                id: "93227",
                key: "foodAllergyFruit",
                label: "Frukt",
              },
              {
                id: "93228",
                key: "foodAllergyGluten",
                label: "Gluten",
              },
              {
                id: "93229",
                key: "foodAllergyVegetables",
                label: "Grönsak",
              },
              {
                id: "93230",
                key: "foodAllergyLactose",
                label: "Laktos",
              },
              {
                id: "93231",
                key: "foodAllergyMilkProtein",
                label: "Mjölkprotein",
              },
              {
                id: "93232",
                key: "foodAllergyNuts",
                label: "Nötter",
              },
              {
                id: "93233",
                key: "foodAllergyShellfish",
                label: "Skaldjur",
              },
              {
                id: "93234",
                key: "foodAllergyMustard",
                label: "Senap",
              },
              {
                id: "93235",
                key: "foodAllergySesame",
                label: "Sesam",
              },
              {
                id: "93236",
                key: "foodAllergyCereals",
                label: "Spannmål",
              },
              {
                id: "93237",
                key: "foodAllergySulphites",
                label: "Svaveldioxid och sulfit",
              },
              {
                id: "93238",
                key: "foodAllergyEgg",
                label: "Ägg",
              },
              {
                id: "93239",
                key: "foodAllergyOther",
                label: "Övriga",
              },
              {
                id: "93240",
                key: "foodAllergyDetails",
                label: "Beskriv din allergi(er) och samt hur du reagerar vid ett allergiskt anfall",
              },
            ],
          },
          {
            title: "Andra allergier",
            questions: [
              {
                id: "93241",
                key: "hasOtherAllergy",
                label: "Har du någon allvarligare allergi som inte är födoämnesrelaterad?",
              },
              {
                id: "93242",
                key: "otherAllergyDetails",
                label:
                  "Beskriv din allergi eller allergier, hur allvarligt du reagerar och vilken medicin du behöver ha med dig",
              },
            ],
          },
          {
            title: "Vaccinationer",
            questions: [
              {
                id: "93244",
                key: "childhoodVaccinationsComplete",
                label:
                  "Är du vaccinerad mot stelkramp och difteri i enlighet med det svenska barnvaccinationsprogrammet?",
              },
              {
                id: "93245",
                key: "diphtheriaBoosterAsAdult",
                label: "Har du fyllt på vaccin mot difteri i vuxen ålder?",
              },
              {
                id: "93246",
                key: "diphtheriaBoosterYear",
                label: "Vilket år fyllde du på difteri?",
              },
              {
                id: "93247",
                key: "tetanusBoosterAsAdult",
                label: "Har du fyllt på vaccin mot stelkramp i vuxen ålder?",
              },
              {
                id: "93248",
                key: "tetanusBoosterYear",
                label: "Vilket år fyllde du på stelkramp?",
              },
            ],
          },
          {
            title: "Fysisk hälsa",
            questions: [
              {
                id: "93249",
                key: "usesPrescriptionMedication",
                label: "Använder du några receptbelagda läkemedel?",
              },
              {
                id: "93250",
                key: "medicationDetails",
                label: "Vilket eller vilka läkemedel och i vilken dos?",
              },
              {
                id: "93251",
                key: "medicationStorageDetails",
                label: "Hur då?",
              },
              {
                id: "93254",
                key: "medicationStorageNeeded",
                label: "Behöver denna förvaras på något speciellt sätt?",
              },
              {
                id: "93255",
                key: "hasMedicalCondition",
                label:
                  "Har du någon sjukdom såsom epelepsi, diabetes, inflamatorisk tarmsjukdom, hjärtsjukdom eller annat?",
              },
              {
                id: "93256",
                key: "medicalConditionDetails",
                label: "Beskriv din sjukdom och hur den påverkar dig",
              },
              {
                id: "93257",
                key: "needsMedicalEquipment",
                label: "Har du något behov av medicinsk utrustning?",
              },
              {
                id: "93258",
                key: "medicalEquipmentNeeds",
                label: "Vilka behov har du?",
              },
              {
                id: "93259",
                key: "medicalEquipmentDetails",
                label: "Berätta vad du behöver",
              },
              {
                id: "93260",
                key: "hasPhysicalLimitations",
                label: "Har du några fysiska begränsningar?",
              },
              {
                id: "93261",
                key: "physicalLimitationsDetails",
                label: "Ange vilka och det behov du har",
              },
              {
                id: "93262",
                key: "mobilityAids",
                label: "Har du behov av att använda något av följande hjälpmedel?",
              },
              {
                id: "93264",
                key: "otherMobilityAidsDetails",
                label: "Ange de andra hjälpmedel du är i behov av",
              },
            ],
          },
          {
            title: "Psykisk hälsa",
            questions: [
              {
                id: "93265",
                key: "cognitiveDiagnoses",
                label:
                  "Har du någon form av diagnos eller kognitiv funktionsnedsättning? Exempelvis",
              },
              {
                id: "93266",
                key: "cognitiveDiagnosesDetails",
                label:
                  "Berätta hur din funktionsnedsättning eller diganos påverkar dig i din vardag och vilket stöd / anpassning du behöver",
              },
              {
                id: "93267",
                key: "hasPhobia",
                label: "Har du någon fobi som begränsar dig i din vardag?",
              },
              {
                id: "93268",
                key: "phobiaDetails",
                label: "Beskriv din fobi och hur den påverkar dig",
              },
              {
                id: "93269",
                key: "hasMentalHealthCondition",
                label:
                  "Har du eller utreds du för (pågående) ångestproblematik, diagnostiserad ätstörning, PTSD eller liknande?",
              },
              {
                id: "93270",
                key: "mentalHealthDetails",
                label: "Beskriv vad och hur den påverkar dig i din vardag",
              },
            ],
          },
          {
            title: "Övriga frågor",
            questions: [
              {
                id: "93211",
                key: "additionalInfo",
                label:
                  "Finns det något vi inte frågat om som du vill att kontingentledningen bör känna till?",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "deltagare_ist",
    tabs: [
      {
        title: "Hälsoinformation",
        sections: [
          {
            title: "Diet och födoämnesallergier",
            questions: [
              {
                id: "86889",
                key: "specialDiet",
                label: "Har du behov av specialkost?",
              },
              {
                id: "88146",
                key: "foodAllergyEgg",
                label: "Ägg",
              },
              {
                id: "88147",
                key: "foodAllergyLactose",
                label: "Laktos",
              },
              {
                id: "88148",
                key: "foodAllergyMilkProtein",
                label: "Mjölkprotein",
              },
              {
                id: "88150",
                key: "foodAllergyNuts",
                label: "Nötter",
              },
              {
                id: "88151",
                key: "foodAllergyFish",
                label: "Fisk",
              },
              {
                id: "88152",
                key: "foodAllergyShellfish",
                label: "Skaldjur",
              },
              {
                id: "88153",
                key: "foodAllergyLegumes",
                label: "Baljväxter",
              },
              {
                id: "88154",
                key: "foodAllergyMustard",
                label: "Senap",
              },
              {
                id: "88155",
                key: "foodAllergyGluten",
                label: "Gluten",
              },
              {
                id: "88156",
                key: "foodAllergyCereals",
                label: "Spannmål",
              },
              {
                id: "88157",
                key: "foodAllergySesame",
                label: "Sesam",
              },
              {
                id: "88158",
                key: "foodAllergySulphites",
                label: "Svaveldioxid och sulfit",
              },
              {
                id: "88159",
                key: "foodAllergyFruit",
                label: "Frukt",
              },
              {
                id: "88160",
                key: "foodAllergyVegetables",
                label: "Grönsak",
              },
              {
                id: "88161",
                key: "foodAllergyOther",
                label: "Övriga",
              },
              {
                id: "88162",
                key: "foodAllergyDetails",
                label: "Beskriv din allergi(er) och samt hur du reagerar vid ett allergiskt anfall",
              },
              {
                id: "88163",
                key: "hasFoodAllergy",
                label: "Har du någon födoämnesrelaterad allergi eller intolerans?",
              },
              {
                id: "88716",
                key: "specialDietDetails",
                label: "Beskriv din specialkost i detalj",
              },
            ],
          },
          {
            title: "Andra allergier",
            questions: [
              {
                id: "87053",
                key: "hasOtherAllergy",
                label: "Har du någon allvarligare allergi som inte är födoämnesrelaterad?",
              },
              {
                id: "88178",
                key: "otherAllergyDetails",
                label:
                  "Beskriv din allergi eller allergier, hur allvarligt du reagerar och vilken medicin du behöver ha med dig",
              },
            ],
          },
          {
            title: "Fysisk hälsa",
            questions: [
              {
                id: "87058",
                key: "needsMedicalEquipment",
                label: "Har du något behov av medicinsk utrustning?",
              },
              {
                id: "87059",
                key: "medicalEquipmentNeeds",
                label: "Vilka behov har du?",
              },
              {
                id: "87060",
                key: "hasPhysicalLimitations",
                label: "Har du några fysiska begränsningar?",
              },
              {
                id: "87061",
                key: "physicalLimitationsDetails",
                label: "Ange vilka och det behov du har",
              },
              {
                id: "87062",
                key: "mobilityAids",
                label: "Har du behov av att använda något av följande hjälpmedel?",
              },
              {
                id: "87063",
                key: "otherMobilityAidsDetails",
                label: "Ange de andra hjälpmedel du är i behov av",
              },
              {
                id: "87313",
                key: "medicalEquipmentDetails",
                label: "Berätta vad du behöver",
              },
              {
                id: "89840",
                key: "usesPrescriptionMedication",
                label: "Använder du några receptbelagda läkemedel?",
              },
              {
                id: "89841",
                key: "medicationStorageDetails",
                label: "Hur då?",
              },
              {
                id: "91238",
                key: "hasMedicalCondition",
                label:
                  "Har du någon sjukdom såsom epelepsi, diabetes, inflamatorisk tarmsjukdom, hjärtsjukdom eller annat?",
              },
              {
                id: "91239",
                key: "medicalConditionDetails",
                label: "Beskriv din sjukdom och hur den påverkar dig",
              },
              {
                id: "92454",
                key: "medicationDetails",
                label: "Vilket eller vilka läkemedel och i vilken dos?",
              },
              {
                id: "93252",
                key: "medicationStorageNeeded",
                label: "Behöver denna förvaras på något speciellt sätt?",
              },
              {
                id: "93253",
                key: "managesOwnMedication",
                label: "Kan du själv ta ansvar för din medicinering?",
              },
            ],
          },
          {
            title: "Förutsättningar",
            questions: [
              {
                id: "87311",
                key: "needsPersonalAssistant",
                label: "Har du behov av ta med dig personlig assistent under arrangemanget?",
              },
              {
                id: "88720",
                key: "sensitivityToUnpredictability",
                label:
                  "Reagerar du på saker som oregelbundna måltider, information som ändras sent och/eller flera gånger, eller varierande möjligheter tilll egentid?",
              },
              {
                id: "89842",
                key: "needsSupportForUnpredictability",
                label: "Har du behov av stöttning för att kunna hantera detta bättre?",
              },
              {
                id: "89888",
                key: "unpredictabilityDetails",
                label: "Beskriv hur detta påverkar dig",
              },
            ],
          },
          {
            title: "Vaccinationer",
            questions: [
              {
                id: "88717",
                key: "childhoodVaccinationsComplete",
                label:
                  "Är du vaccinerad mot stelkramp och difteri i enlighet med det svenska barnvaccinationsprogrammet?",
              },
              {
                id: "88718",
                key: "diphtheriaBoosterAsAdult",
                label: "Har du fyllt på vaccin mot difteri i vuxen ålder?",
              },
              {
                id: "91766",
                key: "tetanusBoosterYear",
                label: "Vilket år fyllde du på stelkramp?",
              },
              {
                id: "91767",
                key: "diphtheriaBoosterYear",
                label: "Vilket år fyllde du på difteri?",
              },
              {
                id: "91768",
                key: "tetanusBoosterAsAdult",
                label: "Har du fyllt på vaccin mot stelkramp i vuxen ålder?",
              },
            ],
          },
          {
            title: "Psykisk hälsa",
            questions: [
              {
                id: "87066",
                key: "cognitiveDiagnosesDetails",
                label:
                  "Berätta hur din funktionsnedsättning eller diganos påverkar dig i din vardag och vilket stöd / anpassning du behöver",
              },
              {
                id: "91266",
                key: "hasPhobia",
                label: "Har du någon fobi som begränsar dig i din vardag?",
              },
              {
                id: "91267",
                key: "phobiaDetails",
                label: "Beskriv din fobi och hur den påverkar dig",
              },
              {
                id: "91268",
                key: "hasMentalHealthCondition",
                label:
                  "Har du eller utreds du för (pågående) ångestproblematik, diagnostiserad ätstörning, PTSD eller liknande?",
              },
              {
                id: "91269",
                key: "mentalHealthDetails",
                label: "Beskriv vad och hur den påverkar dig i din vardag",
              },
              {
                id: "91796",
                key: "cognitiveDiagnoses",
                label:
                  "Har du någon form av diagnos eller kognitiv funktionsnedsättning? Exempelvis",
              },
            ],
          },
          {
            title: "Övriga frågor",
            questions: [
              {
                id: "87312",
                key: "additionalInfoUnitLeader",
                label:
                  "Finns det något vi inte frågat om som du vill att avdelningsledare eller kontingentledningen bör känna till?",
              },
              {
                id: "93212",
                key: "additionalInfo",
                label:
                  "Finns det något vi inte frågat om som du vill att kontingentledningen bör känna till?",
              },
            ],
          },
        ],
      },
      {
        title: "WSJ-relaterad information",
        sections: [
          {
            title: "Erfarenheter",
            questions: [
              {
                id: "87653",
                key: "hasInternationalScoutingExperience",
                label: "Har du tidigare erfarenhet av scouting internationellt?",
              },
              {
                id: "87654",
                key: "internationalScoutingExperienceDetails",
                label: "Beskriv dina erfarenheter av internationell scouting",
              },
              {
                id: "87655",
                key: "hasIndependentTravelExperience",
                label:
                  "Har du erfarenhet av att resa självständigt utomlands, dvs utan vårdnadshavare, scoutledare eller motsvarande?",
              },
              {
                id: "87656",
                key: "independentTravelExperienceDetails",
                label: "Beskriv din erfarenhet(er)",
              },
            ],
          },
          {
            title: "Förutsättningar för aktiviteter",
            questions: [
              {
                id: "88354",
                key: "canSwim200m",
                label: "Kan du simma minst 200 meter?",
              },
              {
                id: "88356",
                // eslint-disable-next-line no-secrets/no-secrets -- a question key, not a secret
                key: "comfortableInLargeCrowds",
                label: "Känner du dig bekväm i stora folksamlingar?",
              },
              {
                id: "88360",
                key: "activityPrerequisitesDetails",
                label:
                  "Om du behöver förtydliga eller ge mer information om dina förutsättningar, gör det här",
              },
            ],
          },
        ],
      },
      {
        title: "Grundläggande information",
        sections: [
          {
            title: "Information redan i Scoutnet",
            questions: [
              {
                id: "85097",
                key: "email",
                label: "Din e-postadress",
              },
              {
                id: "85099",
                key: "alternateEmail",
                label: "Alternativ e-postadress",
              },
              {
                id: "85100",
                key: "mobilePhone",
                label: "Ansökandes mobiltelefon",
              },
            ],
          },
          {
            title: "Kontaktuppgifter närstående 1",
            questions: [
              {
                id: "85101",
                key: "nextOfKin1Name",
                label: "Närstående 1 - Namn",
              },
              {
                id: "85102",
                key: "nextOfKin1Email",
                label: "Närstående 1 - E-post",
              },
              {
                id: "85103",
                key: "nextOfKin1Phone",
                label: "Närstående 1 - Mobiltelefon",
              },
              {
                id: "87647",
                key: "nextOfKin1Relation",
                label: "Närstående 1 - Relation",
              },
            ],
          },
          {
            title: "Kontaktuppgifter närstående 2",
            questions: [
              {
                id: "85104",
                key: "nextOfKin2Name",
                label: "Närstående 2 - Namn",
              },
              {
                id: "85105",
                key: "nextOfKin2Email",
                label: "Närstående 2 - E-post",
              },
              {
                id: "85106",
                key: "nextOfKin2Phone",
                label: "Närstående 2 - Mobiltelefon",
              },
              {
                id: "88137",
                key: "nextOfKin2Relation",
                label: "Närstående 2 - Relation",
              },
            ],
          },
        ],
      },
    ],
  },
]
