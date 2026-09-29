/**
 * Copyright (c) 2005, Jacques Savoy
 * Copyright (c) 2013, Jakub Dundalek.
 * Authored by Ljiljana Dolamic from the University of Neuchatel.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that
 * the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY EXPRESS OR IMPLIED WARRANTIES,
 * INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 * IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY,
 * OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE."
 */

/**
 * Takes care of palatalisation.
 *
 * @param {string} word             The word to stem.
 * @param {Object} morphologyData   The Czech morphology data.
 *
 * @returns {string}                The non-palatalised word or the original word if no such suffix is found.
 */
const palatalise = function (word, morphologyData) {
	const palataliseSuffixes = morphologyData.externalStemmer.palataliseSuffixes
	const len = word.length

	if (word.substring(len - 2, len) === palataliseSuffixes.palataliseSuffixCi ||
		word.substring(len - 2, len) === palataliseSuffixes.palataliseSuffixCe ||
		word.substring(len - 2, len) === palataliseSuffixes.palataliseSuffixCiCaron ||
		word.substring(len - 2, len) === palataliseSuffixes.palataliseSuffixCeCaron) {
		return word.replace(word.substring(len - 2, len), palataliseSuffixes.palataliseSuffixK)
	}
	if (word.substring(len - 2, len) === palataliseSuffixes.palataliseSuffixZi ||
		word.substring(len - 2, len) === palataliseSuffixes.palataliseSuffixZe ||
		word.substring(len - 2, len) === palataliseSuffixes.palataliseSuffixZiCaron ||
		word.substring(len - 2, len) === palataliseSuffixes.palataliseSuffixZeCaron) {
		return word.replace(word.substring(len - 2, len), palataliseSuffixes.palataliseSuffixH)
	}
	if (word.substring(len - 3, len) === palataliseSuffixes.palataliseSuffixCte ||
		word.substring(len - 3, len) === palataliseSuffixes.palataliseSuffixCti ||
		word.substring(len - 3, len) === palataliseSuffixes.palataliseSuffixCtiAccented) {
		return word.replace(word.substring(len - 3, len), palataliseSuffixes.palataliseSuffixCk)
	}
	if (word.substring(len - 3, len) === palataliseSuffixes.palataliseSuffixSte ||
		word.substring(len - 3, len) === palataliseSuffixes.palataliseSuffixSti ||
		word.substring(len - 3, len) === palataliseSuffixes.palataliseSuffixStiAccented) {
		return word.replace(word.substring(len - 3, len), palataliseSuffixes.palataliseSuffixSk)
	}
	return word.slice(0, -1)
}

/**
 * Removes derivational suffixes.
 *
 * @param {string} word             The word to stem.
 * @param {number} len              The length of the word.
 * @param {number} suffixLen        The length of the suffix.
 * @param {string[]} suffixes       The suffixes to match.
 *
 * @returns {string}                The word without derivational suffixes or the original word if no such suffix is found.
 */
const matchesSuffix = function (word, len, suffixLen, suffixes) {
	const ending = word.substring(len - suffixLen, len)

	return suffixes.includes(ending)
}

const removeDerivationalLen5 = function (word, len, derivationalSuffixes, morphologyData) {
	if (word.substring(len - 5, len) === derivationalSuffixes.derivationalSuffixIonar) {
		return palatalise(word.slice(0, -4), morphologyData)
	}

	if (matchesSuffix(word, len, 5, [
		derivationalSuffixes.derivationalSuffixOvisk,
		derivationalSuffixes.derivationalSuffixOvstv,
		derivationalSuffixes.derivationalSuffixOvist,
		derivationalSuffixes.derivationalSuffixOvnik
	])) {
		return word.slice(0, -5)
	}

	return null
}

const removeDerivationalLen4 = function (word, len, derivationalSuffixes, morphologyData) {
	if (matchesSuffix(word, len, 4, [
		derivationalSuffixes.derivationalSuffixAsek, derivationalSuffixes.derivationalSuffixLoun,
		derivationalSuffixes.derivationalSuffixNost, derivationalSuffixes.derivationalSuffixTeln,
		derivationalSuffixes.derivationalSuffixOvec, derivationalSuffixes.derivationalSuffixOvtv,
		derivationalSuffixes.derivationalSuffixOvin, derivationalSuffixes.derivationalSuffixStin
	]) || word.substring(len - 5, len) === derivationalSuffixes.derivationalSuffixOvik) {
		return word.slice(0, -4)
	}

	if (matchesSuffix(word, len, 4, [
		derivationalSuffixes.derivationalSuffixEnic,
		derivationalSuffixes.derivationalSuffixInec,
		derivationalSuffixes.derivationalSuffixItel
	])) {
		return palatalise(word.slice(0, -3), morphologyData)
	}

	return null
}

const removeDerivationalLen3 = function (word, len, derivationalSuffixes, morphologyData) {
	const ending3 = word.substring(len - 3, len)
	const palataliseGroup = [
		derivationalSuffixes.derivationalSuffixEnk, derivationalSuffixes.derivationalSuffixIan,
		derivationalSuffixes.derivationalSuffixIst, derivationalSuffixes.derivationalSuffixIsk,
		derivationalSuffixes.derivationalSuffixIstCaron, derivationalSuffixes.derivationalSuffixItb,
		derivationalSuffixes.derivationalSuffixIrn
	]

	if (palataliseGroup.includes(ending3)) {
		return palatalise(word.slice(0, -2), morphologyData)
	}

	const sliceGroup = [
		derivationalSuffixes.derivationalSuffixArn, derivationalSuffixes.derivationalSuffixOch,
		derivationalSuffixes.derivationalSuffixOst, derivationalSuffixes.derivationalSuffixOvn,
		derivationalSuffixes.derivationalSuffixOun, derivationalSuffixes.derivationalSuffixOut,
		derivationalSuffixes.derivationalSuffixOus, derivationalSuffixes.derivationalSuffixUsk,
		derivationalSuffixes.derivationalSuffixKyn, derivationalSuffixes.derivationalSuffixCan,
		derivationalSuffixes.derivationalSuffixKar, derivationalSuffixes.derivationalSuffixNer,
		derivationalSuffixes.derivationalSuffixNik, derivationalSuffixes.derivationalSuffixCtv,
		derivationalSuffixes.derivationalSuffixStv
	]

	if (sliceGroup.includes(ending3)) {
		return word.slice(0, -3)
	}

	return null
}

const removeDerivationalLen2 = function (word, len, derivationalSuffixes, morphologyData) {
	const ending2 = word.substring(len - 2, len)
	const sliceGroupA = [
		derivationalSuffixes.derivationalSuffixAcAccented, derivationalSuffixes.derivationalSuffixAc,
		derivationalSuffixes.derivationalSuffixAnAccented, derivationalSuffixes.derivationalSuffixAn,
		derivationalSuffixes.derivationalSuffixAr, derivationalSuffixes.derivationalSuffixAs
	]

	if (sliceGroupA.includes(ending2)) {
		return word.slice(0, -2)
	}

	const palataliseGroup = [
		derivationalSuffixes.derivationalSuffixEc, derivationalSuffixes.derivationalSuffixEn,
		derivationalSuffixes.derivationalSuffixEnCaron, derivationalSuffixes.derivationalSuffixEr,
		derivationalSuffixes.derivationalSuffixIr, derivationalSuffixes.derivationalSuffixIc,
		derivationalSuffixes.derivationalSuffixIn, derivationalSuffixes.derivationalSuffixInAccented,
		derivationalSuffixes.derivationalSuffixIt, derivationalSuffixes.derivationalSuffixIv
	]

	if (palataliseGroup.includes(ending2)) {
		return palatalise(word.slice(0, -1), morphologyData)
	}

	const sliceGroupB = [
		derivationalSuffixes.derivationalSuffixOb, derivationalSuffixes.derivationalSuffixOt,
		derivationalSuffixes.derivationalSuffixOv, derivationalSuffixes.derivationalSuffixOn,
		derivationalSuffixes.derivationalSuffixUl, derivationalSuffixes.derivationalSuffixYn,
		derivationalSuffixes.derivationalSuffixCk, derivationalSuffixes.derivationalSuffixCn,
		derivationalSuffixes.derivationalSuffixDl, derivationalSuffixes.derivationalSuffixNk,
		derivationalSuffixes.derivationalSuffixTv, derivationalSuffixes.derivationalSuffixTk,
		derivationalSuffixes.derivationalSuffixVk
	]

	if (sliceGroupB.includes(ending2)) {
		return word.slice(0, -2)
	}

	return null
}

const removeDerivational = function (word, morphologyData) {
	const derivationalSuffixes = morphologyData.externalStemmer.derivationalSuffixes
	const len = word.length

	if ((8 < len) &&
		word.substring(len - 6, len) === derivationalSuffixes.derivationalSuffixObinec) {
		return word.slice(0, -6)
	}
	if (7 < len) {
		const result = removeDerivationalLen5(word, len, derivationalSuffixes, morphologyData)
		if (null !== result) return result
	}
	if (6 < len) {
		const result = removeDerivationalLen4(word, len, derivationalSuffixes, morphologyData)
		if (null !== result) return result
	}
	if (5 < len) {
		const result = removeDerivationalLen3(word, len, derivationalSuffixes, morphologyData)
		if (null !== result) return result
	}
	if (4 < len) {
		const result = removeDerivationalLen2(word, len, derivationalSuffixes, morphologyData)
		if (null !== result) return result
	}
	if (3 < len) {
		if (word.endsWith(derivationalSuffixes.derivationalSuffixC) ||
			word.endsWith(derivationalSuffixes.derivationalSuffixCCaron) ||
			word.endsWith(derivationalSuffixes.derivationalSuffixK) ||
			word.endsWith(derivationalSuffixes.derivationalSuffixL) ||
			word.endsWith(derivationalSuffixes.derivationalSuffixN) ||
			word.endsWith(derivationalSuffixes.derivationalSuffixT)) {
			return word.slice(0, -1)
		}
	}
	return word
}

/**
 * Removes augmentative suffixes.
 *
 * @param {string} word             The word to stem.
 * @param {Object} morphologyData   The Czech morphology data.
 *
 * @returns {string}                The word without augmentative suffixes or the original word if no such suffix is found.
 */
const removeAugmentative = function (word, morphologyData) {
	const augmentativeSuffixes = morphologyData.externalStemmer.augmentativeSuffixes
	const len = word.length

	if ((6 < len) &&
		word.substring(len - 4, len) === augmentativeSuffixes.augmentativeSuffixAjzn) {
		return word.slice(0, -4)
	}
	if ((5 < len) &&
		(word.substring(len - 3, len) === augmentativeSuffixes.augmentativeSuffixIzn ||
		word.substring(len - 3, len) === augmentativeSuffixes.augmentativeSuffixIsk)) {
		word = word.slice(0, -2)
		return palatalise(word, morphologyData)
	}
	return word
}

/**
 * Removes diminutive suffixes.
 *
 * @param {string} word             The word to stem.
 * @param {number} len              The length of the word.
 * @param {string[]} diminutiveSuffixes       The diminutive suffixes to match.
 * @param {Object} morphologyData   The Czech morphology data.
 *
 * @returns {string}                The word without diminutive suffixes or the original word if no such suffix is found.
 */
const removeDiminutiveLen4 = function (word, len, diminutiveSuffixes, morphologyData) {
	const ending4 = word.substring(len - 4, len)
	const palataliseGroup = [
		diminutiveSuffixes.diminutiveSuffixEcek, diminutiveSuffixes.diminutiveSuffixEcekAccented,
		diminutiveSuffixes.diminutiveSuffixIcek, diminutiveSuffixes.diminutiveSuffixIcekAccented,
		diminutiveSuffixes.diminutiveSuffixEnek, diminutiveSuffixes.diminutiveSuffixEnekAccented,
		diminutiveSuffixes.diminutiveSuffixInek, diminutiveSuffixes.diminutiveSuffixInekAccented
	]

	if (palataliseGroup.includes(ending4)) {
		return palatalise(word.slice(0, -3), morphologyData)
	}

	const sliceGroup = [
		diminutiveSuffixes.diminutiveSuffixAcekAccented, diminutiveSuffixes.diminutiveSuffixAcek,
		diminutiveSuffixes.diminutiveSuffixOcek, diminutiveSuffixes.diminutiveSuffixUcek,
		diminutiveSuffixes.diminutiveSuffixAnek, diminutiveSuffixes.diminutiveSuffixOnek,
		diminutiveSuffixes.diminutiveSuffixUnek, diminutiveSuffixes.diminutiveSuffixAnekAccented
	]

	if (sliceGroup.includes(ending4)) {
		return word.slice(0, -4)
	}

	return null
}

const removeDiminutiveLen3 = function (word, len, diminutiveSuffixes, morphologyData) {
	const ending3 = word.substring(len - 3, len)
	const palataliseGroup = [
		diminutiveSuffixes.diminutiveSuffixEck, diminutiveSuffixes.diminutiveSuffixEckAccented,
		diminutiveSuffixes.diminutiveSuffixIck, diminutiveSuffixes.diminutiveSuffixIckAccented,
		diminutiveSuffixes.diminutiveSuffixEnk, diminutiveSuffixes.diminutiveSuffixEnkAccented,
		diminutiveSuffixes.diminutiveSuffixInk, diminutiveSuffixes.diminutiveSuffixInkAccented
	]

	if (palataliseGroup.includes(ending3)) {
		return palatalise(word.slice(0, -3), morphologyData)
	}

	const sliceGroup = [
		diminutiveSuffixes.diminutiveSuffixAckAccented, diminutiveSuffixes.diminutiveSuffixAck,
		diminutiveSuffixes.diminutiveSuffixOck, diminutiveSuffixes.diminutiveSuffixUck,
		diminutiveSuffixes.diminutiveSuffixAnk, diminutiveSuffixes.diminutiveSuffixOnk,
		diminutiveSuffixes.diminutiveSuffixUnk, diminutiveSuffixes.diminutiveSuffixAtk,
		diminutiveSuffixes.diminutiveSuffixAnkAccented, diminutiveSuffixes.diminutiveSuffixUsk
	]

	if (sliceGroup.includes(ending3)) {
		return word.slice(0, -3)
	}

	return null
}

const removeDiminutiveLen2 = function (word, len, diminutiveSuffixes, morphologyData) {
	const ending2 = word.substring(len - 2, len)
	const palataliseGroup = [
		diminutiveSuffixes.diminutiveSuffixEk, diminutiveSuffixes.diminutiveSuffixEkAccented,
		diminutiveSuffixes.diminutiveSuffixIkAccented, diminutiveSuffixes.diminutiveSuffixIk
	]

	if (palataliseGroup.includes(ending2)) {
		return palatalise(word.slice(0, -1), morphologyData)
	}

	const sliceGroup = [
		diminutiveSuffixes.diminutiveSuffixAkAccented, diminutiveSuffixes.diminutiveSuffixAk,
		diminutiveSuffixes.diminutiveSuffixOk, diminutiveSuffixes.diminutiveSuffixUk
	]

	if (sliceGroup.includes(ending2)) {
		return word.slice(0, -1)
	}

	return null
}

const removeDiminutive = function (word, morphologyData) {
	const diminutiveSuffixes = morphologyData.externalStemmer.diminutiveSuffixes
	const len = word.length

	if ((7 < len) &&
		word.substring(len - 5, len) === diminutiveSuffixes.diminutiveSuffixOusek) {
		return word.slice(0, -5)
	}
	if (6 < len) {
		const result = removeDiminutiveLen4(word, len, diminutiveSuffixes, morphologyData)
		if (null !== result) return result
	}
	if (5 < len) {
		const result = removeDiminutiveLen3(word, len, diminutiveSuffixes, morphologyData)
		if (null !== result) return result
	}
	if (4 < len) {
		const result = removeDiminutiveLen2(word, len, diminutiveSuffixes, morphologyData)
		if (null !== result) return result
	}
	if ((3 < len) &&
		word.substring(len - 1, len) === diminutiveSuffixes.diminutiveSuffixK) {
		return word.slice(0, -1)
	}
	return word
}

/**
 * Removes comparative suffixes.
 *
 * @param {string} word             The word to stem.
 * @param {Object} morphologyData   The Czech morphology data.
 *
 * @returns {string}                The word without comparative suffixes or the original word if no such suffix is found.
 */
const removeComparative = function (word, morphologyData) {
	const comparativeSuffixes = morphologyData.externalStemmer.comparativeSuffixes
	const len = word.length

	if ((5 < len) &&
		(word.substring(len - 3, len) ===  comparativeSuffixes.comparativeSuffixesEjs ||
		word.substring(len - 3, len) === comparativeSuffixes.comparativeSuffixesEjsCaron)) {
		word = word.slice(0, -2)
		return palatalise(word, morphologyData)
	}
	return word
}

/**
 * Removes possessive suffixes.
 *
 * @param {string} word             The word to stem.
 * @param {Object} morphologyData   The Czech morphology data.
 *
 * @returns {string}                The word without possessive suffixes or the original word if no such suffix is found.
 */
const removePossessives = function (word, morphologyData) {
	const possessiveSuffixes = morphologyData.externalStemmer.possessiveSuffixes
	const len = word.length

	if (5 < len) {
		if (word.substring(len - 2, len) === possessiveSuffixes.possessiveSuffixOv) {
			return word.slice(0, -2)
		}
		if (word.substring(len - 2, len) === possessiveSuffixes.possessiveSuffixesUv) {
			return word.slice(0, -2)
		}
		if (word.substring(len - 2, len) === possessiveSuffixes.possessiveSuffixIn) {
			word = word.slice(0, -1)
			return palatalise(word, morphologyData)
		}
	}
	return word
}

/**
 * Removes case suffixes.
 *
 * @param {string} word             The word to stem.
 * @param {Object} morphologyData   The Czech morphology data.
 *
 * @returns {string}                The word without case suffixes or the original word if no such suffix is found.
 */
const removeCase = function (word, morphologyData) {
	const caseSuffixes = morphologyData.externalStemmer.caseSuffixes
	const len = word.length

	if ((7 < len) &&
		word.substring(len - 5, len) === caseSuffixes.caseSuffixAtech) {
		return word.slice(0, -5)
	}
	if (6 < len) {
		if (word.substring(len - 4, len) === caseSuffixes.caseSuffixEtem) {
			word = word.slice(0, -3)
			return palatalise(word, morphologyData)
		}
		if (word.substring(len - 4, len) === caseSuffixes.caseSuffixAtum) {
			return word.slice(0, -4)
		}
	}
	if (5 < len) {
		if (word.substring(len - 3, len) === caseSuffixes.caseSuffixEch ||
			word.substring(len - 3, len) ===  caseSuffixes.caseSuffixIch ||
			word.substring(len - 3, len) ===  caseSuffixes.caseSuffixIchAccented ||
			word.substring(len - 3, len) === caseSuffixes.caseSuffixEho ||
			word.substring(len - 3, len) === caseSuffixes.caseSuffixEmiCaron ||
			word.substring(len - 3, len) === caseSuffixes.caseSuffixEmi ||
			word.substring(len - 3, len) === caseSuffixes.caseSuffixEmuAccented ||
			word.substring(len - 3, len) === caseSuffixes.caseSuffixEte ||
			word.substring(len - 3, len) === caseSuffixes.caseSuffixEti ||
			word.substring(len - 3, len) === caseSuffixes.caseSuffixIho ||
			word.substring(len - 3, len) === caseSuffixes.caseSuffixIhoAccented ||
			word.substring(len - 3, len) === caseSuffixes.caseSuffixImi ||
			word.substring(len - 3, len) === caseSuffixes.caseSuffixImu) {
			word = word.slice(0, -2)
			return palatalise(word, morphologyData)
		} else if (word.substring(len - 3, len) === caseSuffixes.caseSuffixAchAccented ||
			word.substring(len - 3, len) === caseSuffixes.caseSuffixAta ||
			word.substring(len - 3, len) === caseSuffixes.caseSuffixAty ||
			word.substring(len - 3, len) === caseSuffixes.caseSuffixYch ||
			word.substring(len - 3, len) === caseSuffixes.caseSuffixAma ||
			word.substring(len - 3, len) === caseSuffixes.caseSuffixAmi ||
			word.substring(len - 3, len) === caseSuffixes.caseSuffixOve ||
			word.substring(len - 3, len) === caseSuffixes.caseSuffixOvi ||
			word.substring(len - 3, len) === caseSuffixes.caseSuffixYmi) {
			return word.slice(0, -3)
		}
	}
	if (4 < len) {
		if (word.substring(len - 2, len) === caseSuffixes.caseSuffixEm) {
			word = word.slice(0, -1)
			return palatalise(word, morphologyData)
		} else if (word.substring(len - 2, len) === caseSuffixes.caseSuffixEs ||
			word.substring(len - 2, len) === caseSuffixes.caseSuffixEmAccented ||
			word.substring(len - 2, len) === caseSuffixes.caseSuffixIm) {
			word = word.slice(0, -2)
			return palatalise(word, morphologyData)
		} else if (word.substring(len - 2, len) === caseSuffixes.caseSuffixUm ||
			word.substring(len - 2, len) === caseSuffixes.caseSuffixAt ||
			word.substring(len - 2, len) === caseSuffixes.caseSuffixAm ||
			word.substring(len - 2, len) === caseSuffixes.caseSuffixOs ||
			word.substring(len - 2, len) === caseSuffixes.caseSuffixUs ||
			word.substring(len - 2, len) === caseSuffixes.caseSuffixYm ||
			word.substring(len - 2, len) === caseSuffixes.caseSuffixMi ||
			word.substring(len - 2, len) === caseSuffixes.caseSuffixOu) {
			return word.slice(0, -2)
		}
	}
	if (3 < len) {
		if (word.substring(len - 1, len) === caseSuffixes.caseSuffixE ||
			word.substring(len - 1, len) ===  caseSuffixes.caseSuffixI ||
			word.substring(len - 1, len) === caseSuffixes.caseSuffixIAccented ||
			word.substring(len - 1, len) === caseSuffixes.caseSuffixECaron) {
			return palatalise(word, morphologyData)
		} else if (word.substring(len - 1, len) === caseSuffixes.caseSuffixU ||
			word.substring(len - 1, len) === caseSuffixes.caseSuffixY ||
			word.substring(len - 1, len) === caseSuffixes.caseSuffixURing ||
			word.substring(len - 1, len) === caseSuffixes.caseSuffixA ||
			word.substring(len - 1, len) === caseSuffixes.caseSuffixO ||
			word.substring(len - 1, len) === caseSuffixes.caseSuffixAAccented ||
			word.substring(len - 1, len) === caseSuffixes.caseSuffixEAccented ||
			word.substring(len - 1, len) === caseSuffixes.caseSuffixYAccented) {
			return word.slice(0, -1)
		}
	}
	return word
}

/**
 * Checks whether a word is in the full-form exception list and if so returns the canonical stem.
 *
 * @param {string} word	            The word to be checked.
 * @param {Object} morphologyData   The Czech morphology data.
 *
 * @returns {string}                The canonical stem if word was found on the list or the original word otherwise.
 */
const checkWordInFullFormExceptions = function (word, morphologyData) {
	for (const paradigm of morphologyData.externalStemmer.exceptionStemsWithFullForms) {
		if (paradigm[1].includes(word)) {
			return paradigm[0]
		}
	}
	return word
}

/**
 * Check whether the stem is on the exception list of stems that belong to one word. If it is, returns the canonical stem.
 *
 * @param {string}	word			The stemmed word.
 * @param {Object} morphologyData   The Czech morphology data.
 *
 * @returns {string}                The canonical stem if word was found on the list or the original word otherwise.
 */
const canonicalizeStem = function (word, morphologyData) {
	// Checks the nouns list.
	for (const paradigm of morphologyData.externalStemmer.stemsThatBelongToOneWord.nouns) {
		if (paradigm.includes(word)) {
			return paradigm[0]
		}
	}
	return word
}

/**
 * Stems Czech words.
 *
 * @param {string} word             The word to stem.
 * @param {Object} morphologyData   The Czech morphology data.
 *
 * @returns {string}                The stemmed word.
 */
export default function stem (word, morphologyData) {
	word = word.toLowerCase()
	// Checks if the word is on an exception list for which all forms of a word and its stem are listed.
	word = checkWordInFullFormExceptions(word, morphologyData)
	// Removes case endings from nouns and adjectives.
	word = removeCase(word, morphologyData)
	// Removes possessive -ov- and -in- endings from names.
	word = removePossessives(word, morphologyData)
	// Removes comparative endings.
	word = removeComparative(word, morphologyData)
	// Removes diminutive endings.
	word = removeDiminutive(word, morphologyData)
	// Removes augmentatives endings.
	word = removeAugmentative(word, morphologyData)
	// Removes derivational suffixes from nouns.
	word = removeDerivational(word, morphologyData)
	// Checks whether the stem is on the exception list of stems that belong to one word.
	word = canonicalizeStem(word, morphologyData)

	return word
}