const {remote} = require('webdriverio');
const fs = require('fs');

const MAIN_URL = "https://www.zalando-lounge.pl";
const PATH_LOGIN = "/#/login";
const LOGIN = process.env.LOGIN;
const PASS = process.env.PASS;
const USER = process.env.USER;


;(async () => {
    const browser = await remote({
        capabilities: {
            browserName: 'chrome',
            'goog:chromeOptions': {
                args: ['--window-size=1600,900']
            }
        }
    })

    const userConfig = Storage.read(`user-${USER}`)

    await Login.restoreCookies(browser);
    await browser.url(MAIN_URL);
    await Page.closeCookiesPolicyModal(browser);
    await Login.logIn(browser);


    // const categoryButton = await browser.$('h2[text=Infolinia]')
    // console.log('categoryButton', await categoryButton.isDisplayedInViewport())
    // await browser.execute('window.scroll(0, 90000)')
    // await browser.pause(20000)
    // console.log('categoryButton', await categoryButton.isDisplayedInViewport())

    const openCampaigns = []
    const openCampaignsElements = await browser.$$('#campaigns-open div a');

    for (let campaign of openCampaignsElements) {
        let campaignUrl = await campaign.getAttribute('href');
        if (campaignUrl) {
            openCampaigns.push(campaignUrl)
        }
    }

    for (let campaignUrl of openCampaigns) {
        await browser.url(getUrl(campaignUrl))
        await CampaignPage.scrollToBottom(browser)
        await CampaignPage.scanOffers(browser, userConfig)
    }

    await browser.freeze();
    await browser.deleteSession()
})()

const getUrl = (path) => {
    return MAIN_URL + path;
}

const screenshot = async (browser) => {
    await browser.saveScreenshot('./screenshots/screenshot.png')
}

class Page {
    static async pageWrapper(browser) {
        return await browser.$('#page-wrapper')
    }

    static async scrollToBottom(browser) {
        // Scroll to bottom as many times as needed
        // to lazy-load the whole page content.
        let bottomReached = false;
        do {
            await browser.execute('window.scroll(0, window.scrollY + 1500)')
            await browser.pause(1000)
            bottomReached = (await (await Footer.infolineHeader(browser)).isDisplayedInViewport())
        } while (!bottomReached)
    }

    static async cookiesPolicyAcceptButton(browser) {
        return await browser.$('#uc-btn-accept-banner')
    }

    static async closeCookiesPolicyModal(browser) {
        if (await (await Page.cookiesPolicyAcceptButton(browser)).isDisplayed()) {
            await (await Page.cookiesPolicyAcceptButton(browser)).click()
        }
    }
}

class CampaignPage extends Page {
    static async scanOffers(browser, userConfig) {
        const articles = await browser.$$('#articleListWrapper > div')
        const articlesToBeReserved = []

        for (let article of articles) {
            const articleElementId = await article.getAttribute('id');
            if (!articleElementId) {
                continue;
            }

            const articleCode = articleElementId.replace('article-', '')
            if (userConfig['watched-articles'].includes(articleCode)) {
                const articlePath = await (await article.$('a')).getAttribute('href');
                articlesToBeReserved.push(articlePath)
            }
        }

        for (let articlePath of articlesToBeReserved) {
            await browser.url(getUrl(articlePath));
            await ArticlePage.makeReservation(browser, userConfig);
        }
    }
}

class ArticlePage extends Page {

    static async makeReservation(browser, userConfig) {
        // const sizes = userConfig['sizes'];

        try {
            const sizeButton = await browser.$('span=M');
            await sizeButton.click()
        } catch (e) {}

        try {
            const sizeButton = await browser.$('span=46');
            await sizeButton.click()
        } catch (e) {}

        try {
            const addToBasket = await browser.$('span=Do koszyka')
            await addToBasket.click()
        } catch (e) {}

    }
}

class Nav {
    static async accountIcon(browser) {
        return browser.$('#nav-to-myaccount')
    }
}

class Login {
    static async logIn(browser) {
        if (!await (await Nav.accountIcon(browser)).isDisplayed()) {
            await browser.url(getUrl(PATH_LOGIN))
            await browser.pause(3000)
            await (await Login.eMailInput(browser)).setValue(LOGIN)
            await (await Login.passInput(browser)).setValue(PASS)
            await (await Login.continueButton(browser)).click()
            await browser.pause(3000)
            await Login.saveCookies(browser);
        }
    }

    static async eMailInput(browser) {
        return await browser.$('#form-email');
    }

    static async passInput(browser) {
        return await browser.$('#form-password')
    }

    static async continueButton(browser) {
        return await browser.$('button[type=submit]');
    }

    static async restoreCookies(browser) {
        const cookies = Storage.read('cookies');
        await browser.setCookies(cookies);
    }

    static async saveCookies(browser) {
        const cookies = await browser.getCookies();
        Storage.write('cookies', cookies);
    }
}

class Footer {
    static async infolineHeader(browser) {
        return await browser.$('h2=Infolinia')
    }
}

class Storage {
    static read(key) {
        const storage = JSON.parse(fs.readFileSync('storage.json'));
        return storage[key]
    }

    static write(key, value) {
        let storage = JSON.parse(fs.readFileSync('storage.json'));
        storage = {...storage, [key]: value}
        fs.writeFileSync('storage.json', JSON.stringify(storage));
    }
}
