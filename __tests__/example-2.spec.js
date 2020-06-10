/***************************************************
 * Created by nanyuantingfeng on 2020/6/10 09:56. *
 ***************************************************/

describe('connect two iframe pages', () => {
  let page

  beforeAll(async () => {
    page = await global.__BROWSER__.newPage()
    await page.goto(`file://${__dirname}/../examples/example-2-connect-for-two-iframes/main.html`)
  })

  afterAll(async () => {
    await page.close()
  })

  async function getIframeById(id) {
    const iframeHandle = await page.$(id)
    return await iframeHandle.contentFrame()
  }

  it('should call function invocations between "iframe" and "iframe"', async () => {
    const iframe0 = await getIframeById('#iframe-0')
    const button = await iframe0.$('#button-0')
    await button.click()
    await page.waitFor(1000)

    const result = await iframe0.evaluate(() => {
      return window.__RESULT__
    })
    expect(result).toEqual({ ax: false, d: { e: 99 }, f: 1 })

    const iframe1 = await getIframeById('#iframe-1')
    await iframe1.waitForSelector('#button-0')
    const button2 = await iframe1.$('#button-0')
    await button2.click()
    await page.waitFor(1000)

    const result2 = await iframe1.evaluate(() => {
      return window.__RESULT__
    })
    expect(result2).toEqual({ K: 22 })
  })
})
