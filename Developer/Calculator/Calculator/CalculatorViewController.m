//
//  CalculatorViewController.m
//  Calculator
//
//  Created by Adnan Chowdhury on 23/12/2011.
//  Copyright (c) 2011 __MyCompanyName__. All rights reserved.
//

#import "CalculatorViewController.h"
#import "CalculatorBrain.h"

@interface CalculatorViewController()
@property (nonatomic) BOOL userIsInTheMiddleOfEnteringANumber;
@property (nonatomic, strong) CalculatorBrain *brain;
@end

@implementation CalculatorViewController
@synthesize display = _display;
@synthesize history = _history;
@synthesize userIsInTheMiddleOfEnteringANumber;
@synthesize brain = _brain;



//Create calculator brain getter
- (CalculatorBrain *)brain {
    if (!_brain) _brain = [[CalculatorBrain alloc] init];
    return _brain;
}


//When digit is pressed, displays it on display and history
- (IBAction)digitPressed:(UIButton *)sender {
    NSString *digit = [sender currentTitle];
    if (self.userIsInTheMiddleOfEnteringANumber) {
        self.display.text = [self.display.text stringByAppendingString:digit];
        self.history.text = [self.history.text stringByAppendingFormat:digit];
    }
    else {
        self.display.text = digit;
        if (self.history.text == nil) {
            self.history.text = digit;
        } else {
            self.history.text = [self.history.text stringByAppendingString:digit];
        }
        
        self.userIsInTheMiddleOfEnteringANumber = YES;
        
    }
    
}


//When enter is pressed, operands are pushed, history displays a blank space.
- (IBAction)enterPressed {
    [self.brain pushOperand:[self.display.text doubleValue]];
    self.history.text = [self.history.text stringByAppendingFormat:@" "];
    self.userIsInTheMiddleOfEnteringANumber = NO;
}

//When decimal point is pressed, allows the display and history to show the decimal point.
- (IBAction)decimalPressed:(id)sender {
    NSString *currentDisplayNumber = self.display.text;
    NSRange range = [currentDisplayNumber rangeOfString:@"."];
    if (range.location != NSNotFound) {
        self.userIsInTheMiddleOfEnteringANumber = NO;
    }
    else {
        self.display.text = [self.display.text stringByAppendingString:@"."];
        self.history.text = [self.history.text stringByAppendingString:@"."];
    }
}

//When operations are pressed, show operation in history and push the operand to the brain.
- (IBAction)operationPressed:(UIButton *)sender {
    if (self.userIsInTheMiddleOfEnteringANumber) {
        [self enterPressed];
    }
    
    NSString *operation = sender.currentTitle;
    self.history.text = [self.history.text stringByAppendingFormat:operation];
    self.history.text = [self.history.text stringByAppendingFormat:@" "];
    double  result = [self.brain performOperation:operation];
    self.display.text = [NSString stringWithFormat:@"%g", result];
}

//When clear button is pressed, clear the display, history and brain.
- (IBAction)clearPressed:(id)sender {
    self.userIsInTheMiddleOfEnteringANumber = NO;
    self.display.text = nil;
    self.display.text = @"0";
    self.history.text = nil;
    self.brain = nil;
}

- (void)viewDidUnload {
    [self setHistory:nil];
    [self setHistory:nil];
    [super viewDidUnload];
}
@end
